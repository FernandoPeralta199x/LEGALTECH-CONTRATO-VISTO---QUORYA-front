"use client";

import {
  ArrowUpDown,
  Briefcase,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  Search,
  Users
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Notification } from "@/components/Notification";
import { PageTitle } from "@/components/PageTitle";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errorMessage";
import { listCases } from "@/services/cases";
import { triageStatusLabel as triageStatusText } from "@/lib/reportLabels";
import type { Case, Priority } from "@/types";

// Casos que fazem parte da fila operacional do analista.
const REVIEW_RELEVANT_STATUSES = new Set([
  "awaiting_triage",
  "triage_running",
  "triage_partial",
  "triage_completed",
  "ai_running",
  "report_ready",
  "needs_human_review",
  "failed"
]);

// Etapas por aba (o "Todos" é toda a fila operacional).
const QUEUE_STATUSES = new Set([
  "awaiting_triage",
  "triage_running",
  "triage_partial",
  "ai_running",
  "failed"
]);
const COMPLETED_STATUSES = new Set(["triage_completed"]);
const REVIEW_STATUSES = new Set(["report_ready", "needs_human_review"]);

type FilterTab = "all" | "queue" | "completed" | "review";
type SortKey = "updated" | "priority" | "progress";

const PRIORITY_ORDER: Record<Priority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3
};

function triageQueueCases(cases: Case[]): Case[] {
  return cases.filter((legalCase) => REVIEW_RELEVANT_STATUSES.has(legalCase.status));
}

function triageStatusLabel(legalCase: Case): string {
  const triageStatus = legalCase.metadata?.triageStatus;
  const raw = typeof triageStatus === "string" ? triageStatus : legalCase.status;
  return triageStatusText(raw);
}

function metadataText(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return fallback;
}

function caseTitle(legalCase: Case): string {
  return legalCase.title ?? metadataText(legalCase.metadata?.title, legalCase.caseType);
}

function partiesCount(legalCase: Case): string {
  return metadataText(legalCase.metadata?.partiesCount, String(legalCase.parties.length));
}

/** Cor do tile-ícone à esquerda da linha, por etapa (âncora visual + escaneabilidade). */
function statusAccent(status: string): { box: string; icon: string } {
  if (status === "triage_completed") {
    return { box: "border-emerald-500/25 bg-emerald-500/10", icon: "text-emerald-400" };
  }
  if (status === "report_ready" || status === "needs_human_review") {
    return { box: "border-blue-500/25 bg-blue-500/10", icon: "text-blue-400" };
  }
  if (status === "failed") {
    return { box: "border-red-500/25 bg-red-500/10", icon: "text-red-400" };
  }
  return { box: "border-[var(--border)] bg-black/20", icon: "text-[var(--text3)]" };
}

/** Barra de progresso compacta e acessível. */
function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span className="flex items-center gap-2" title={`${pct}% concluído`}>
      <span
        aria-hidden="true"
        className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10"
      >
        <span
          className="block h-full rounded-full bg-gradient-to-r from-[var(--teal)] to-emerald-400 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="min-w-[2.25rem] font-mono tabular-nums text-[11px] text-[var(--text2)]">{pct}%</span>
    </span>
  );
}

export default function AnalystPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [error, setError] = useState("");
  const [fallbackReason, setFallbackReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortKey>("updated");

  const refreshCases = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await listCases();
      setCases(result.data);
      setFallbackReason(result.source === "mock" ? result.fallbackReason ?? "" : "");
    } catch (err) {
      setCases([]);
      setFallbackReason("");
      setError(errorMessage(err, "Não foi possível carregar a triagem operacional."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCases();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshCases]);

  const queue = useMemo(() => triageQueueCases(cases), [cases]);

  const counts = useMemo(
    () => ({
      all: queue.length,
      queue: queue.filter((c) => QUEUE_STATUSES.has(c.status)).length,
      completed: queue.filter((c) => COMPLETED_STATUSES.has(c.status)).length,
      review: queue.filter((c) => REVIEW_STATUSES.has(c.status)).length
    }),
    [queue]
  );

  const tabs: Array<{ id: FilterTab; label: string; count: number }> = [
    { id: "all", label: "Todos", count: counts.all },
    { id: "queue", label: "Na fila", count: counts.queue },
    { id: "completed", label: "Triagem concluída", count: counts.completed },
    { id: "review", label: "Revisão / relatório", count: counts.review }
  ];

  const visibleCases = useMemo(() => {
    let list = queue;

    if (filterTab !== "all") {
      const set =
        filterTab === "queue"
          ? QUEUE_STATUSES
          : filterTab === "completed"
            ? COMPLETED_STATUSES
            : REVIEW_STATUSES;
      list = list.filter((c) => set.has(c.status));
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const haystack = `${c.code} ${caseTitle(c)} ${c.clientName ?? ""}`.toLowerCase();
        return haystack.includes(q);
      });
    }

    const sorted = [...list];
    if (sort === "priority") {
      sorted.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]);
    } else if (sort === "progress") {
      sorted.sort((a, b) => b.progressPercent - a.progressPercent);
    } else {
      sorted.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
    return sorted;
  }, [queue, filterTab, query, sort]);

  return (
    <AuthGuard allowedRoles={["admin", "analyst"]}>
      <AppLayout>
        <PageTitle
          actions={
            <>
              <Button href="/cases/new" icon={<FileText aria-hidden="true" size={15} />}>
                Novo Pedido
              </Button>
              <Button
                icon={<ClipboardCheck aria-hidden="true" size={15} />}
                loading={loading}
                onClick={() => void refreshCases()}
                variant="secondary"
              >
                Atualizar
              </Button>
            </>
          }
          description="Fila de casos criados pelo fluxo Novo Pedido. Filtre pela etapa, busque um caso e abra os documentos para analisar. Esta tela não executa IA/RAG real nem parecer jurídico final."
          eyebrow="Analista"
          title="Triagem e revisão operacional"
        />

        {fallbackReason && (
          <Notification title="Sem conexão com o servidor" tone="warning">
            Não foi possível conectar ao servidor. A fila pode estar desatualizada.
          </Notification>
        )}

        {/* Barra de busca + ordenação */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
              size={15}
            />
            <input
              aria-label="Buscar casos na fila"
              className="cv-input w-full pl-9 pr-3 text-sm"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por código, cliente ou título..."
              type="search"
              value={query}
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <ArrowUpDown
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
              size={13}
            />
            <select
              aria-label="Ordenar casos"
              className="cv-input w-full pl-9 pr-3 text-xs font-medium [&_option]:bg-[var(--surf)]"
              onChange={(event) => setSort(event.target.value as SortKey)}
              value={sort}
            >
              <option value="updated">Atualizado (recente)</option>
              <option value="priority">Prioridade</option>
              <option value="progress">Progresso</option>
            </select>
          </div>
        </div>

        {/* Abas de filtro (os antigos indicadores, agora acionáveis) */}
        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = filterTab === tab.id;
            return (
              <button
                aria-pressed={active}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-150 active:scale-[0.97]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50",
                  active
                    ? "border-brand-teal/50 bg-brand-teal/10 text-brand-teal shadow-[0_2px_10px_-4px_rgba(32,201,151,0.45)]"
                    : "border-[var(--border)] bg-[var(--surf2)] text-[var(--text2)] hover:border-brand-teal/30 hover:bg-[var(--surf)] hover:text-[var(--text)]"
                )}
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                type="button"
              >
                {tab.label}
                <span
                  className={cn(
                    "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none font-mono tabular-nums transition-colors",
                    active
                      ? "bg-brand-teal text-[#05201a]"
                      : "bg-black/25 text-[var(--text2)] group-hover:text-[var(--text)]"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <LoadingState
            description="Carregando a fila de triagem."
            label="Carregando triagem"
          />
        ) : error ? (
          <ErrorState
            action={
              <Button
                icon={<ClipboardCheck size={15} />}
                onClick={() => void refreshCases()}
                variant="secondary"
              >
                Tentar novamente
              </Button>
            }
            description="Não foi possível carregar a fila de triagem. Erros de autenticação ou permissão são exibidos diretamente."
            details={error}
          />
        ) : queue.length === 0 ? (
          <EmptyState
            action={<Button href="/cases/new">Novo Pedido</Button>}
            description="Crie um pedido pelo Wizard para que o backend gere request, case, timeline e plano de triagem por case_id."
            icon={<ClipboardCheck size={20} />}
            secondaryAction={
              <Button href="/cases" variant="secondary">
                Ver Casos
              </Button>
            }
            title="Nenhum caso operacional em triagem"
          />
        ) : visibleCases.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surf)] px-4 py-10 text-center text-sm text-[var(--text2)]">
            Nenhum caso corresponde ao filtro
            {query.trim() ? ` “${query.trim()}”` : ""}.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surf)]">
            {visibleCases.map((legalCase, index) => {
              const accent = statusAccent(legalCase.status);
              return (
                <div
                  className={cn(
                    "group flex items-start gap-3.5 px-4 py-3.5 transition animate-in hover:bg-[var(--surf2)]",
                    index > 0 && "border-t border-[var(--border)]"
                  )}
                  key={legalCase.id}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div
                    className={cn(
                      "mt-0.5 hidden h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors sm:grid",
                      accent.box
                    )}
                  >
                    <Briefcase aria-hidden="true" className={accent.icon} size={16} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold tabular-nums text-brand-teal-dark">
                          {legalCase.code}
                        </span>
                        <StatusBadge status={legalCase.status} />
                        <PriorityBadge priority={legalCase.priority} />
                      </div>
                      <p className="truncate text-[13.5px] font-semibold leading-snug text-[var(--text)]">
                        {caseTitle(legalCase)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-[var(--text2)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Users aria-hidden="true" className="text-[var(--text3)]" size={12} />
                          <b className="font-mono font-semibold tabular-nums text-[var(--text)]">
                            {partiesCount(legalCase)}
                          </b>
                          partes
                        </span>
                        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[var(--text3)]" />
                        <span className="inline-flex items-center gap-1.5">
                          <FileText aria-hidden="true" className="text-[var(--text3)]" size={12} />
                          <b className="font-mono font-semibold tabular-nums text-[var(--text)]">
                            {legalCase.documentsCount}
                          </b>
                          docs
                        </span>
                        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[var(--text3)]" />
                        <span
                          className="inline-flex items-center gap-1.5"
                          title={triageStatusLabel(legalCase)}
                        >
                          <Clock aria-hidden="true" className="text-[var(--text3)]" size={11} />
                          {formatDate(legalCase.updatedAt)}
                        </span>
                        <span
                          aria-hidden="true"
                          className="hidden h-1 w-1 rounded-full bg-[var(--text3)] sm:inline-block"
                        />
                        <ProgressBar value={legalCase.progressPercent} />
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        className="pressable inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surf)] px-3 py-2 text-xs font-medium text-[var(--text2)] transition hover:border-brand-teal/40 hover:text-[var(--text)]"
                        href={`/cases/${legalCase.id}#documents`}
                      >
                        <FileText aria-hidden="true" size={13} />
                        Documentos
                      </Link>
                      <Link
                        className="pressable inline-flex items-center gap-1 rounded-lg border border-brand-teal/30 bg-brand-teal/10 px-3 py-2 text-xs font-semibold text-brand-teal transition hover:bg-brand-teal/15"
                        href={`/cases/${legalCase.id}`}
                      >
                        Abrir
                        <ChevronRight aria-hidden="true" size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
