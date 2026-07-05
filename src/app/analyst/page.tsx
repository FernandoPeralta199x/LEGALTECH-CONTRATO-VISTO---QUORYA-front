"use client";

import {
  ArrowUpDown,
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
import { errorMessage } from "@/src/lib/errorMessage";
import { listCases } from "@/src/services/cases";
import { triageStatusLabel as triageStatusText } from "@/src/lib/reportLabels";
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
      <span className="min-w-[2.25rem] tabular-nums text-[11px] text-[var(--text2)]">{pct}%</span>
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
    <AuthGuard>
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
          <Notification title="Fallback local ativo" tone="warning">
            API local indisponível: a fila abaixo usa apenas casos criados no fallback local
            deste navegador.
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
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition",
                  active
                    ? "border-brand-teal/45 bg-brand-teal/10 text-brand-teal"
                    : "border-[var(--border)] bg-[var(--surf2)] text-[var(--text2)] hover:border-brand-teal/30"
                )}
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                type="button"
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                    active
                      ? "bg-brand-teal/15 text-brand-teal"
                      : "border border-[var(--border)] bg-[var(--surf)] text-[var(--text)]"
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
            description="Consultando a fila operacional de casos do MVP local/mock."
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
            description="A fila de triagem não pôde ser carregada. Erros de autenticação ou permissão não são mascarados por dados demonstrativos."
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
            {visibleCases.map((legalCase, index) => (
              <div
                className={cn(
                  "flex flex-col gap-3 px-4 py-3 transition hover:bg-[var(--surf2)] sm:flex-row sm:items-center sm:gap-4",
                  index > 0 && "border-t border-[var(--border)]"
                )}
                key={legalCase.id}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold tabular-nums text-brand-teal-dark">
                      {legalCase.code}
                    </span>
                    <StatusBadge status={legalCase.status} />
                    <PriorityBadge priority={legalCase.priority} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--text2)]">
                    <span className="truncate text-[13px] font-semibold text-[var(--text)]">
                      {caseTitle(legalCase)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users aria-hidden="true" size={12} />
                      <b className="font-semibold text-[var(--text)]">{partiesCount(legalCase)}</b>
                      partes
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText aria-hidden="true" size={12} />
                      <b className="font-semibold text-[var(--text)]">{legalCase.documentsCount}</b>
                      docs
                    </span>
                    <span className="flex items-center gap-1.5" title={triageStatusLabel(legalCase)}>
                      <Clock aria-hidden="true" size={11} />
                      {formatDate(legalCase.updatedAt)}
                    </span>
                    <ProgressBar value={legalCase.progressPercent} />
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surf2)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:border-brand-teal/40"
                    href={`/cases/${legalCase.id}#documents`}
                  >
                    <FileText aria-hidden="true" size={13} />
                    Documentos
                  </Link>
                  <Link
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-teal/30 bg-brand-teal/10 px-3 py-1.5 text-xs font-semibold text-brand-teal transition hover:bg-brand-teal/15"
                    href={`/cases/${legalCase.id}`}
                  >
                    Abrir caso
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
