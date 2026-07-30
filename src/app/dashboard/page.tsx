"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Plus,
  RefreshCw,
  Upload,
  UsersRound
} from "lucide-react";
import Link from "next/link";

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
import { badgeStyle, processAreas } from "@/components/dashboard/config";
import { caseDisplayTitle, formatDate } from "@/lib/formatters";
import { useDashboardData } from "@/lib/useDashboardData";
import { useSession } from "@/lib/useSession";

export default function DashboardPage() {
  const session = useSession();
  // Atalhos adminOnly só para admin (eixo role) — espelha o gate do Sidebar.
  const visibleAreas = processAreas.filter(
    (area) => !("adminOnly" in area) || session?.role === "admin"
  );
  const {
    documents,
    error,
    setError,
    fallbackActive,
    loading,
    statsDegraded,
    refreshDashboard,
    totalCasesDisplay,
    totalClientsDisplay,
    activeCasesDisplay,
    recentCases,
    recentDocuments,
    hasData
  } = useDashboardData();

  return (
    <AuthGuard>
      <AppLayout>
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
          description="Acompanhe seus casos, organize documentos, faça a triagem e gere relatórios — tudo a partir de um novo pedido."
          eyebrow="Dashboard"
          title="Painel operacional"
        />

        {/* ── API status notifications ── */}
        {!loading && fallbackActive && (
          <Notification title="Sem conexão com o servidor" tone="warning">
            Não foi possível conectar ao servidor. As métricas e listas podem
            estar desatualizadas.
          </Notification>
        )}
        {!loading && !fallbackActive && statsDegraded && (
          <Notification title="Totais parciais" tone="warning">
            Não foi possível carregar os totais consolidados. Os números dos cards
            refletem apenas os itens já carregados, não o total real.
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
        {!loading && !error && !fallbackActive && !statsDegraded && hasData && (
          <div className="mb-5 flex items-center gap-2 text-xs text-[var(--text2)]">
            <CheckCircle2
              aria-hidden="true"
              className="shrink-0 text-[var(--teal)]"
              size={13}
            />
            Dados carregados com sucesso.
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
                  Consolidado de clientes, casos e documentos já cadastrados.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(
                  [
                    {
                      label: "Total de casos",
                      value: totalCasesDisplay,
                      detail: "Pedidos já convertidos em casos",
                      icon: BriefcaseBusiness,
                      color: "text-[var(--teal)]",
                      bg: "bg-[var(--teal-dim)] border-[rgba(32,201,151,0.22)]"
                    },
                    {
                      label: "Clientes",
                      value: totalClientsDisplay,
                      detail: "Base de relacionamento",
                      icon: UsersRound,
                      color: "text-[var(--blue)]",
                      bg: "bg-[var(--blue-dim)] border-[rgba(96,165,250,0.22)]"
                    },
                    {
                      label: "Documentos",
                      value: documents.length,
                      // documents.length é a contagem carregada (a lista é limitada), não um
                      // total consolidado como casos/clientes — rotulado para não confundir.
                      detail: "Documentos carregados nesta lista",
                      icon: FileText,
                      color: "text-[var(--teal)]",
                      bg: "bg-[var(--teal-dim)] border-[rgba(32,201,151,0.22)]"
                    },
                    {
                      label: "Casos em andamento",
                      value: activeCasesDisplay,
                      detail: "Acompanhamento operacional",
                      icon: ClipboardCheck,
                      color: "text-[var(--orange)]",
                      bg: "bg-[var(--orange-dim)] border-[rgba(249,115,22,0.22)]"
                    }
                  ] as const
                ).map((metric, index) => {
                  const Icon = metric.icon;
                  return (
                    <div
                      className="cv-card animate-in p-5"
                      key={metric.label}
                      style={{ animationDelay: `${index * 55}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--text2)]">
                            {metric.label}
                          </p>
                          <p
                            className={`mt-3 font-mono text-3xl font-bold tracking-tight ${metric.color}`}
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
                  Acesse rapidamente as áreas da operação.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleAreas.map((area, index) => {
                    const Icon = area.icon;
                    return (
                      <Link
                        className={`cv-card cv-card-hover pressable animate-in group flex flex-col gap-3 p-4 ${
                          area.primary
                            ? "border-[rgba(32,201,151,0.35)] bg-[var(--teal-dim)]"
                            : ""
                        }`}
                        href={area.href}
                        key={area.href}
                        style={{ animationDelay: `${index * 45}ms` }}
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
                description="Seus casos mais recentes."
                title="Casos recentes"
              >
                {recentCases.length === 0 ? (
                  <EmptyState
                    action={
                      <Button href="/cases/new" icon={<Plus size={15} />}>
                        Novo Pedido
                      </Button>
                    }
                    description="Nenhum caso ainda. Crie um novo pedido para começar."
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
                          <p className="font-mono text-[11px] font-semibold text-[var(--teal)]">
                            {legalCase.code}
                          </p>
                          <p className="mt-0.5 truncate text-xs font-medium text-[var(--text)]">
                            {caseDisplayTitle(legalCase)}
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
                description="Seus documentos mais recentes."
                title="Documentos recentes"
              >
                {recentDocuments.length === 0 ? (
                  <EmptyState
                    action={
                      <Button href="/documents" icon={<Upload size={15} />}>
                        Enviar documento
                      </Button>
                    }
                    description="Nenhum documento ainda. Envie um arquivo para começar."
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
                            <span className="font-mono">{doc.caseCode}</span> ·{" "}
                            {formatDate(doc.uploadedAt)}
                          </p>
                        </div>
                        <StatusBadge status={doc.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </div>

          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
