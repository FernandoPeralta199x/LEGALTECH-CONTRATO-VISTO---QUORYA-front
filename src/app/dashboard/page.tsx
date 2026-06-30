"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Info,
  Plus,
  RefreshCw,
  Shield,
  Upload,
  UserPlus,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Notification } from "@/components/Notification";
import { PageTitle } from "@/components/PageTitle";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/formatters";
import { errorMessage } from "@/src/lib/errorMessage";
import { listCases } from "@/src/services/cases";
import { listClients } from "@/src/services/clients";
import { listDocuments } from "@/src/services/documents";
import type { Case, Client, Document } from "@/types";

type ActionBadge =
  | "Base"
  | "Entrada"
  | "Entrega"
  | "Governança"
  | "Insumos"
  | "MVP local"
  | "Operacional"
  | "Simulado";

const badgeStyle: Record<ActionBadge, string> = {
  Base:
    "bg-[var(--blue-dim)] text-[var(--blue)] border-[rgba(96,165,250,0.25)]",
  Entrada:
    "bg-[var(--teal-dim)] text-[var(--teal)] border-[rgba(32,201,151,0.3)]",
  Entrega:
    "bg-[var(--surf3)] text-[var(--text2)] border-[var(--bd)]",
  Governança:
    "bg-[var(--orange-dim)] text-[var(--orange)] border-[rgba(249,115,22,0.25)]",
  Insumos:
    "bg-[var(--blue-dim)] text-[var(--blue)] border-[rgba(96,165,250,0.25)]",
  Operacional:
    "bg-[var(--teal-dim)] text-[var(--teal)] border-[rgba(32,201,151,0.25)]",
  "MVP local":
    "bg-[var(--blue-dim)] text-[var(--blue)] border-[rgba(96,165,250,0.25)]",
  Simulado:
    "bg-[var(--surf3)] text-[var(--text2)] border-[var(--bd)]"
};

const ACTIVE_STATUSES = new Set<string>([
  "submitted",
  "triagem_pendente",
  "coleta_pendente",
  "processamento_documental",
  "analise_contratual",
  "compliance",
  "minuta_relatorio",
  "revisao_humana",
  "processing",
  "review",
  "approved"
]);

const processAreas = [
  {
    title: "Novo Pedido",
    description: "Entrada principal pelo wizard MVP local.",
    href: "/cases/new",
    icon: Plus,
    badge: "Entrada" as ActionBadge,
    primary: true
  },
  {
    title: "Casos",
    description: "Acompanhamento operacional dos pedidos criados.",
    href: "/cases",
    icon: BriefcaseBusiness,
    badge: "Operacional" as ActionBadge,
    primary: false
  },
  {
    title: "Documentos",
    description: "Arquivos locais e metadados como insumos.",
    href: "/documents",
    icon: Upload,
    badge: "Insumos" as ActionBadge,
    primary: false
  },
  {
    title: "Analista",
    description: "Triagem local e revisão conceitual.",
    href: "/analyst",
    icon: ClipboardCheck,
    badge: "Governança" as ActionBadge,
    primary: false
  },
  {
    title: "Relatórios",
    description: "Entrega e revisão do MVP local.",
    href: "/reports",
    icon: FileText,
    badge: "Entrega" as ActionBadge,
    primary: false
  },
  {
    title: "Clientes",
    description: "Base de relacionamento da operação.",
    href: "/clients",
    icon: UserPlus,
    badge: "Base" as ActionBadge,
    primary: false
  },
  {
    title: "Administração",
    description: "Governança local e papéis demonstrativos.",
    href: "/admin",
    icon: Shield,
    badge: "Governança" as ActionBadge,
    primary: false
  }
] as const;

function caseTitle(legalCase: Case): string {
  const title = legalCase.metadata?.title;
  return typeof title === "string" && title.trim() ? title : legalCase.caseType;
}

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState("");
  const [fallbackActive, setFallbackActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const clientsResult = await listClients();
      const [casesResult, documentsResult] = await Promise.all([
        listCases(clientsResult.data),
        listDocuments()
      ]);
      setClients(clientsResult.data);
      setDocuments(documentsResult.data);
      setCases(
        casesResult.data.map((legalCase) => ({
          ...legalCase,
          documentsCount: documentsResult.data.filter(
            (document) => document.caseId === legalCase.id
          ).length
        }))
      );
      setFallbackActive(
        clientsResult.source === "mock" ||
          casesResult.source === "mock" ||
          documentsResult.source === "mock"
      );
    } catch (err) {
      setError(errorMessage(err, "Não foi possível carregar o dashboard."));
      setFallbackActive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshDashboard]);

  const activeCasesCount = useMemo(
    () => cases.filter((c) => ACTIVE_STATUSES.has(c.status)).length,
    [cases]
  );
  const recentCases = useMemo(() => cases.slice(0, 4), [cases]);
  const recentDocuments = useMemo(() => documents.slice(0, 3), [documents]);
  const hasData =
    cases.length > 0 || clients.length > 0 || documents.length > 0;

  return (
    <AuthGuard>
      <AppLayout>
        {/* ── Environment badge ── */}
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            <Info aria-hidden="true" size={11} />
            MVP local controlado
          </span>
        </div>

        {/* ── Hero ── */}
        <PageTitle
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                className="sm:min-w-44"
                href="/cases/new"
                icon={<Plus aria-hidden="true" size={17} />}
                size="lg"
              >
                Novo Pedido
              </Button>
              <Button
                href="/cases"
                icon={<ArrowRight aria-hidden="true" size={15} />}
                variant="secondary"
              >
                Ver casos
              </Button>
              <Button
                icon={<RefreshCw aria-hidden="true" size={15} />}
                loading={loading}
                onClick={() => void refreshDashboard()}
                variant="secondary"
              >
                Atualizar
              </Button>
            </div>
          }
          description="Cockpit do MVP local. O fluxo começa em Novo Pedido; daqui você acompanha casos, organiza documentos como insumos locais, passa pela triagem local e consulta relatórios sem AWS, IA/OCR/RAG reais."
          eyebrow="Dashboard"
          title="Painel operacional"
        />

        {/* ── API status notifications ── */}
        {!loading && fallbackActive && (
          <Notification title="Fallback local ativo" tone="warning">
            O backend local não respondeu. Métricas e listas estão usando dados
            demonstrativos do fallback local.
          </Notification>
        )}
        {!loading && error && (
          <Notification
            onDismiss={() => setError("")}
            title="Erro de API"
            tone="error"
          >
            {error}
          </Notification>
        )}
        {!loading && !error && !fallbackActive && hasData && (
          <div className="mb-5 flex items-center gap-2 text-xs text-[var(--text2)]">
            <CheckCircle2
              aria-hidden="true"
              className="shrink-0 text-[var(--teal)]"
              size={13}
            />
            API local respondendo — dados carregados do backend local.
          </div>
        )}

        {/* ── Main content ── */}
        {loading ? (
          <LoadingState
            description="Consolidando clientes, casos e documentos."
            label="Carregando dados operacionais"
            rows={4}
          />
        ) : error && !hasData ? (
          <ErrorState
            action={
              <Button
                icon={<RefreshCw size={15} />}
                onClick={() => void refreshDashboard()}
                variant="secondary"
              >
                Tentar novamente
              </Button>
            }
            description="Não foi possível montar a visão geral. Verifique se o Docker Compose está rodando com postgres + api em 127.0.0.1:8000."
            details={error}
          />
        ) : (
          <div className="space-y-8">

            {/* ── Metrics ── */}
            <section aria-labelledby="metrics-heading">
              <div className="mb-4">
                <h2
                  className="text-sm font-semibold text-[var(--text)]"
                  id="metrics-heading"
                >
                  Métricas operacionais
                </h2>
                <p className="text-xs leading-5 text-[var(--text2)]">
                  Dados carregados por clientes, casos e documentos já
                  existentes no MVP local.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(
                  [
                    {
                      label: "Total de casos",
                      value: cases.length,
                      detail: "Pedidos já convertidos em casos",
                      icon: BriefcaseBusiness,
                      color: "text-[var(--teal)]",
                      bg: "bg-[var(--teal-dim)] border-[rgba(32,201,151,0.22)]"
                    },
                    {
                      label: "Clientes",
                      value: clients.length,
                      detail: "Base de relacionamento",
                      icon: UsersRound,
                      color: "text-[var(--blue)]",
                      bg: "bg-[var(--blue-dim)] border-[rgba(96,165,250,0.22)]"
                    },
                    {
                      label: "Documentos",
                      value: documents.length,
                      detail: "Insumos vinculados aos casos",
                      icon: FileText,
                      color: "text-[var(--teal)]",
                      bg: "bg-[var(--teal-dim)] border-[rgba(32,201,151,0.22)]"
                    },
                    {
                      label: "Casos em andamento",
                      value: activeCasesCount,
                      detail: "Acompanhamento operacional",
                      icon: ClipboardCheck,
                      color: "text-[var(--orange)]",
                      bg: "bg-[var(--orange-dim)] border-[rgba(249,115,22,0.22)]"
                    }
                  ] as const
                ).map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div className="cv-card p-5" key={metric.label}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--text2)]">
                            {metric.label}
                          </p>
                          <p
                            className={`mt-3 text-3xl font-bold ${metric.color}`}
                          >
                            {metric.value}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--text3)]">
                            {metric.detail}
                          </p>
                        </div>
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${metric.bg}`}
                        >
                          <Icon
                            aria-hidden="true"
                            className={metric.color}
                            size={18}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Process areas and next steps ── */}
            <section aria-labelledby="actions-heading">
              <div className="mb-4 flex flex-col gap-1">
                <h2
                  className="text-sm font-semibold text-[var(--text)]"
                  id="actions-heading"
                >
                  Áreas do processo
                </h2>
                <p className="text-xs leading-5 text-[var(--text2)]">
                  Atalhos para operar o ciclo sem sair do contexto do cockpit.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {processAreas.map((area) => {
                    const Icon = area.icon;
                    return (
                      <Link
                        className={`cv-card cv-card-hover group flex flex-col gap-3 p-4 ${
                          area.primary
                            ? "border-[rgba(32,201,151,0.35)] bg-[var(--teal-dim)]"
                            : ""
                        }`}
                        href={area.href}
                        key={area.href}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                              area.primary
                                ? "border-[rgba(32,201,151,0.3)] bg-[var(--surf)] text-[var(--teal)]"
                                : "border-[var(--bd)] bg-[var(--surf2)] text-[var(--text2)] group-hover:border-[rgba(32,201,151,0.25)] group-hover:bg-[var(--teal-dim)] group-hover:text-[var(--teal)]"
                            }`}
                          >
                            <Icon aria-hidden="true" size={16} />
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeStyle[area.badge]}`}
                          >
                            {area.badge}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[var(--text)]">
                            {area.title}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-4 text-[var(--text2)]">
                            {area.description}
                          </p>
                        </div>
                      </Link>
                    );
                })}
              </div>
            </section>

            {/* ── Recent activity ── */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent cases */}
              <Card
                actions={
                  <Link
                    className="flex items-center gap-1 text-xs text-[var(--teal)] transition hover:opacity-80"
                    href="/cases"
                  >
                    Ver todos{" "}
                    <ArrowRight aria-hidden="true" size={12} />
                  </Link>
                }
                description="Últimos casos carregados da API local ou fallback."
                title="Casos recentes"
              >
                {recentCases.length === 0 ? (
                  <EmptyState
                    action={
                      <Button href="/cases/new" icon={<Plus size={15} />}>
                        Novo Pedido
                      </Button>
                    }
                    description="Nenhum caso carregado. Inicie pelo wizard para validar o fluxo integrado com dados fictícios."
                    icon={<BriefcaseBusiness size={20} />}
                    title="Fila vazia"
                    variant="compact"
                  />
                ) : (
                  <div className="divide-y divide-[var(--bd)]">
                    {recentCases.map((legalCase) => (
                      <Link
                        className="-mx-2 flex flex-col gap-2 rounded-lg px-2 py-3 transition hover:bg-[var(--surf3)] sm:flex-row sm:items-center sm:justify-between"
                        href={`/cases/${legalCase.id}`}
                        key={legalCase.id}
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-brand-teal">
                            {legalCase.code}
                          </p>
                          <p className="mt-0.5 truncate text-xs font-medium text-[var(--text)]">
                            {caseTitle(legalCase)}
                          </p>
                          <p className="text-[11px] text-[var(--text2)]">
                            {legalCase.clientName}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <PriorityBadge priority={legalCase.priority} />
                          <StatusBadge status={legalCase.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              {/* Recent documents */}
              <Card
                actions={
                  <Link
                    className="flex items-center gap-1 text-xs text-[var(--teal)] transition hover:opacity-80"
                    href="/documents"
                  >
                    Ver todos{" "}
                    <ArrowRight aria-hidden="true" size={12} />
                  </Link>
                }
                description="Últimos documentos carregados da API local ou fallback."
                title="Documentos recentes"
              >
                {recentDocuments.length === 0 ? (
                  <EmptyState
                    action={
                      <Button href="/documents" icon={<Upload size={15} />}>
                        Enviar documento
                      </Button>
                    }
                    description="Nenhum documento carregado. Envie um arquivo fictício para validar o fluxo."
                    icon={<FileText size={20} />}
                    title="Sem documentos"
                    variant="compact"
                  />
                ) : (
                  <div className="divide-y divide-[var(--bd)]">
                    {recentDocuments.map((doc) => (
                      <Link
                        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-[var(--surf3)]"
                        href={`/cases/${doc.caseId}`}
                        key={doc.id}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surf3)]">
                          <FileText
                            aria-hidden="true"
                            className="text-[var(--text2)]"
                            size={14}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-[var(--text)]">
                            {doc.filename}
                          </p>
                          <p className="text-[11px] text-[var(--text2)]">
                            {doc.caseCode} · {formatDate(doc.uploadedAt)}
                          </p>
                        </div>
                        <StatusBadge status={doc.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* ── MVP limits ── */}
            <section aria-labelledby="mvp-limits-heading">
              <div className="rounded-lg border border-blue-500/20 bg-blue-50 px-5 py-4 dark:bg-blue-500/10">
                <div className="flex items-start gap-3">
                  <Info
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
                    size={15}
                  />
                  <div>
                    <p
                      className="text-xs font-semibold text-blue-800 dark:text-blue-300"
                      id="mvp-limits-heading"
                    >
                      Ambiente local de desenvolvimento
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                      {[
                        "Sem Cognito real",
                        "Sem S3 real",
                        "Sem SQS real",
                        "Sem OCR real",
                        "Sem IA / RAG real",
                        "Wizard sem submit real"
                      ].map((item) => (
                        <p
                          className="flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-300/80"
                          key={item}
                        >
                          <span
                            aria-hidden="true"
                            className="h-1 w-1 shrink-0 rounded-full bg-blue-400"
                          />
                          {item}
                        </p>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-blue-600 dark:text-blue-400/80">
                      Use apenas dados fictícios neste ambiente. Nenhuma
                      informação real deve ser inserida.
                    </p>
                  </div>
                </div>
              </div>
            </section>

          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
