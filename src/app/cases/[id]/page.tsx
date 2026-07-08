"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Mail,
  Pencil,
  Phone,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Shield,
  Users
} from "lucide-react";
import type { FormEvent } from "react";
import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";

import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CasePaymentCard } from "@/components/cases/CasePaymentCard";
import { CaseReportTab } from "@/components/cases/CaseReportTab";
import { TriageModuleCard } from "@/components/cases/TriageModuleCard";
import { PaymentReceiptSheet } from "@/components/cases/PaymentReceiptSheet";
import { TriagePrintSheet } from "@/components/cases/TriagePrintSheet";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/FormField";
import { LoadingState } from "@/components/LoadingState";
import { Notification } from "@/components/Notification";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { caseDisplayTitle, formatDate } from "@/lib/formatters";
import { errorMessage } from "@/src/lib/errorMessage";
import {
  aggregatePartyFromCaseParty,
  useCasePartiesEditor
} from "@/src/lib/useCasePartiesEditor";
import { getCaseAggregate } from "@/src/services/cases";
import {
  generateCaseReport,
  reviewCaseReport,
  runCaseTriage
} from "@/src/services/caseWorkflow";
import { useDevSession } from "@/src/lib/useDevSession";
import {
  productLabel,
  recommendationLabel,
  reportStatusLabel,
  riskLabel,
  triageStatusLabel
} from "@/src/lib/reportLabels";
import {
  FINAL_REPORT_ACCEPT_ATTR,
  FINAL_REPORT_ACCEPTED_MIME,
  getFinalReportDownloadUrl,
  listFinalReports,
  uploadFinalReport,
  type FinalReportDocument
} from "@/src/services/finalReports";
import type {
  Case,
  CaseAggregate,
  CaseParty,
  Document,
  ProviderResult
} from "@/types";

const TABS = [
  { id: "overview", label: "Visão geral", icon: ClipboardList },
  { id: "parties", label: "Partes", icon: Users },
  { id: "documents", label: "Documentos", icon: FileText },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "agents", label: "Triagem local", icon: Bot },
  { id: "report", label: "Relatório", icon: Shield }
];

const partyTypeOptions = [
  { label: "Cliente", value: "cliente" },
  { label: "Contraparte", value: "contraparte" },
  { label: "Testemunha", value: "testemunha" },
  { label: "Responsável", value: "responsavel" },
  { label: "Outro", value: "outro" }
];

const partyTypeLabel: Record<string, string> = {
  avalista: "Avalista",
  cliente: "Cliente",
  contraparte: "Contraparte",
  contratada: "Contratada",
  contratante: "Contratante",
  fiador: "Fiador",
  outro: "Outro",
  responsavel: "Responsável",
  testemunha: "Testemunha"
};

type PageProps = { params: Promise<{ id: string }> };

function sourceModeLabel(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "api";
  }

  const labels: Record<string, string> = {
    hybrid: "híbrido",
    local: "local",
    mock: "mock",
    real: "real",
    simulated: "simulado"
  };

  return labels[value] ?? value;
}

function ProviderResultRow({ result }: { result: ProviderResult }) {
  return (
    <div className="rounded-lg border border-[var(--bd)] bg-[var(--surf2)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[var(--text)]">{result.provider}</p>
          <p className="mt-0.5 text-[11px] text-[var(--text3)]">
            {sourceModeLabel(result.sourceMode)}
            {typeof result.confidence === "number"
              ? ` · confiança ${(result.confidence * 100).toFixed(0)}%`
              : ""}
          </p>
        </div>
        <StatusBadge status={result.status} />
      </div>
      {result.summary && (
        <p className="mt-2 text-xs leading-5 text-[var(--text2)]">
          {result.summary}
        </p>
      )}
      {result.riskSignals.length > 0 && (
        <p className="mt-2 text-[11px] text-[var(--text3)]">
          Sinais: {result.riskSignals.join(", ")}
        </p>
      )}
    </div>
  );
}

export default function CaseDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("overview");
  // Deep-link de aba via hash (ex.: /cases/{id}#documents abre direto a aba Documentos,
  // usado pelas ações rápidas da fila do Analista).
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (["overview", "parties", "documents", "timeline", "agents", "report"].includes(hash)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- o fragmento (#tab) só existe no cliente e não chega ao servidor; é uma sincronização única no mount, sem loop.
      setActiveTab(hash);
    }
  }, []);
  const [caseAggregate, setCaseAggregate] = useState<CaseAggregate | null>(null);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [caseDocuments, setCaseDocuments] = useState<Document[]>([]);
  const [caseParties, setCaseParties] = useState<CaseParty[]>([]);
  const [error, setError] = useState("");
  const [fallbackReason, setFallbackReason] = useState("");
  const [aggregateSource, setAggregateSource] = useState<"api" | "mock">("api");
  const [loading, setLoading] = useState(true);

  // Formulário de partes (criar/editar/validar/submeter) extraído para hook
  // próprio — a página segue dona da lista (syncCaseParties, hoisted abaixo).
  const {
    editingParty,
    partyError,
    partyForm,
    partyFormErrors,
    partySubmitting,
    partySuccessMessage,
    showPartyForm,
    dismissPartyError,
    dismissPartySuccess,
    resetPartyForm,
    startCreateParty,
    startEditParty,
    updatePartyForm,
    handlePartySubmit
  } = useCasePartiesEditor({
    caseId: id,
    applyParties: (updater) => syncCaseParties(updater),
    onFallbackReason: setFallbackReason
  });
  const [finalReports, setFinalReports] = useState<FinalReportDocument[]>([]);
  const [finalReportUploading, setFinalReportUploading] = useState(false);
  const [finalReportError, setFinalReportError] = useState("");
  const [finalReportSuccess, setFinalReportSuccess] = useState("");

  const session = useDevSession();
  const canWrite = session ? ["admin", "analyst"].includes(session.role) : false;
  const [triageRunning, setTriageRunning] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [printTarget, setPrintTarget] = useState<string | null>(null);
  const [printReceipt, setPrintReceipt] = useState(false);
  const [workflowNotice, setWorkflowNotice] = useState<{
    tone: "success" | "error";
    title: string;
    description: string;
  } | null>(null);

  // Token de carga: invalida o setState de um refresh anterior quando o id troca
  // (ou um novo refresh começa), evitando exibir dados do caso errado numa corrida.
  const latestLoad = useRef(0);

  const refreshFinalReports = useCallback(async () => {
    const token = latestLoad.current;
    try {
      const reports = await listFinalReports(id);
      if (token !== latestLoad.current) return;
      setFinalReports(reports);
    } catch (err) {
      if (token !== latestLoad.current) return;
      setFinalReportError(errorMessage(err, "Não foi possível carregar relatórios finais."));
      setFinalReports([]);
    }
  }, [id]);

  async function handleFinalReportUpload(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    // Validate MIME / extension
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const allowedExt = ["pdf", "docx", "doc", "txt"];
    if (
      !FINAL_REPORT_ACCEPTED_MIME.includes(file.type) &&
      !allowedExt.includes(ext)
    ) {
      setFinalReportError(
        "Tipo de arquivo não suportado. Envie PDF, DOCX ou TXT."
      );
      input.value = "";
      return;
    }

    // Size limit: 25 MB (a generous cap for legal reports)
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFinalReportError("Arquivo excede o limite de 25 MB.");
      input.value = "";
      return;
    }

    setFinalReportUploading(true);
    setFinalReportError("");
    setFinalReportSuccess("");
    try {
      const doc = await uploadFinalReport(id, file);
      setFinalReports((current) => [doc, ...current]);
      setFinalReportSuccess(`"${doc.filename}" enviado com sucesso.`);
    } catch (err) {
      setFinalReportError(errorMessage(err, "Falha ao enviar o relatório."));
    } finally {
      setFinalReportUploading(false);
      input.value = "";
    }
  }

  async function handleFinalReportDownload(documentId: string) {
    try {
      const url = await getFinalReportDownloadUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setFinalReportError(
        errorMessage(err, "Não foi possível gerar o link de download.")
      );
    }
  }

  const refreshCase = useCallback(async () => {
    const token = ++latestLoad.current;
    setLoading(true);
    setError("");

    try {
      const aggregateResult = await getCaseAggregate(id);
      if (token !== latestLoad.current) return; // id trocou / novo refresh — descarta
      setCaseAggregate(aggregateResult.data);
      setCaseData(aggregateResult.data.case);
      setCaseDocuments(aggregateResult.data.documents);
      setCaseParties(aggregateResult.data.parties);
      setAggregateSource(aggregateResult.source);
      setFallbackReason(
        aggregateResult.source === "mock" ? aggregateResult.fallbackReason ?? "" : ""
      );
      void refreshFinalReports();
    } catch (err) {
      if (token !== latestLoad.current) return;
      setError(errorMessage(err));
      setFallbackReason("");
      setCaseAggregate(null);
      setCaseData(null);
      setCaseDocuments([]);
      setCaseParties([]);
    } finally {
      if (token === latestLoad.current) setLoading(false);
    }
  }, [id, refreshFinalReports]);

  async function handleRunTriage() {
    if (triageRunning) return;
    setTriageRunning(true);
    setWorkflowNotice(null);
    try {
      const result = await runCaseTriage(id);
      await refreshCase();
      setWorkflowNotice({
        tone: "success",
        title: "Triagem executada",
        description: `${result.modules_executed} módulos processados. Risco estimado: ${result.risk_level}.`
      });
    } catch (err) {
      setWorkflowNotice({
        tone: "error",
        title: "Falha na triagem",
        description: errorMessage(err, "Não foi possível executar a triagem.")
      });
    } finally {
      setTriageRunning(false);
    }
  }

  async function handleGenerateReport() {
    if (reportBusy) return;
    setReportBusy(true);
    setWorkflowNotice(null);
    try {
      await generateCaseReport(id);
      await refreshCase();
      setWorkflowNotice({
        tone: "success",
        title: "Relatório gerado",
        description: "Parecer consolidado a partir das evidências da triagem."
      });
    } catch (err) {
      setWorkflowNotice({
        tone: "error",
        title: "Falha ao gerar relatório",
        description: errorMessage(err, "Não foi possível gerar o relatório.")
      });
    } finally {
      setReportBusy(false);
    }
  }

  async function handleApproveReport() {
    if (approving) return;
    setApproving(true);
    setWorkflowNotice(null);
    try {
      await reviewCaseReport(id, { status: "approved" });
      await refreshCase();
      setApproveOpen(false);
      setWorkflowNotice({
        tone: "success",
        title: "Relatório aprovado",
        description: "Revisão humana registrada; o caso foi concluído."
      });
    } catch (err) {
      setWorkflowNotice({
        tone: "error",
        title: "Falha ao aprovar",
        description: errorMessage(err, "Não foi possível aprovar o relatório.")
      });
    } finally {
      setApproving(false);
    }
  }

  function syncCaseParties(updater: (current: CaseParty[]) => CaseParty[]) {
    setCaseParties((current) => {
      const next = updater(current);
      setCaseData((currentCase) =>
        currentCase ? { ...currentCase, parties: next } : currentCase
      );
      setCaseAggregate((currentAggregate) =>
        currentAggregate
          ? {
              ...currentAggregate,
              case: { ...currentAggregate.case, parties: next },
              parties: next.map((party) =>
                aggregatePartyFromCaseParty(
                  party,
                  currentAggregate.case.organizationId ?? ""
                )
              ),
              summary: {
                ...currentAggregate.summary,
                partiesCount: next.length
              }
            }
          : currentAggregate
      );
      return next;
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCase();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshCase]);

  // Impressão/PDF das evidências: renderiza a folha, dispara o print e limpa no afterprint.
  useEffect(() => {
    if (!printTarget) {
      return;
    }
    const done = () => setPrintTarget(null);
    window.addEventListener("afterprint", done);
    window.print();
    return () => window.removeEventListener("afterprint", done);
  }, [printTarget]);

  // Impressão/PDF do comprovante de pagamento (folha PaymentReceiptSheet).
  useEffect(() => {
    if (!printReceipt) {
      return;
    }
    const done = () => setPrintReceipt(false);
    window.addEventListener("afterprint", done);
    window.print();
    return () => window.removeEventListener("afterprint", done);
  }, [printReceipt]);

  if (loading) {
    return (
      <AuthGuard>
        <AppLayout>
          <LoadingState
            description="Consultando visão local do caso, cliente e documentos indicados."
            label="Carregando caso"
            rows={4}
          />
        </AppLayout>
      </AuthGuard>
    );
  }

  if (!caseData) {
    return (
      <AuthGuard>
        <AppLayout>
          <ErrorState
            action={
              <Button href="/cases" variant="secondary">
                Voltar para casos
              </Button>
            }
            description="Não foi possível carregar o detalhe do caso. Verifique se está logado com permissões adequadas e se a API local está disponível."
            details={error || "Caso não encontrado."}
            title="Caso não encontrado"
          />
        </AppLayout>
      </AuthGuard>
    );
  }

  const caseTimeline = caseAggregate?.timeline ?? [];
  const triageModules = caseAggregate?.triageModules ?? [];
  // O mapper normaliza o "done" do backend para "completed" (StatusBadge).
  const triageHasRun = triageModules.some((module) => module.status === "completed");
  const caseIsCompleted = caseData?.status === "completed";
  const providerResults = caseAggregate?.providerResults ?? [];
  const resultByModule = new Map(
    providerResults.map((result) => [result.triageModuleId, result])
  );
  const caseReport = caseAggregate?.report ?? null;
  const summary = caseAggregate?.summary;
  // Pagamento só é exibido com dados reais da API (fallback local não tem plano).
  const paymentStatus = caseAggregate?.paymentStatus ?? "pending";
  const installmentPlan = caseAggregate?.installmentPlan ?? null;
  const showPayment = aggregateSource === "api";
  const paymentPending = showPayment && paymentStatus === "pending";

  return (
    <AuthGuard>
      <AppLayout>
        {fallbackReason && (
          <Notification title="Fallback local do MVP" tone="warning">
            API local indisponível: detalhes carregados por fallback mockado local.
          </Notification>
        )}
        {error && (
          <Notification title="Atenção" tone="error">
            {error}
          </Notification>
        )}
        {!canWrite && (
          <Notification title="Modo leitura" tone="warning">
            Ações de escrita (rodar triagem, gerar/aprovar relatório, editar partes)
            são restritas aos perfis admin e analista.
          </Notification>
        )}
        {workflowNotice && (
          <Notification
            onDismiss={() => setWorkflowNotice(null)}
            title={workflowNotice.title}
            tone={workflowNotice.tone}
          >
            {workflowNotice.description}
          </Notification>
        )}
        {partySuccessMessage && (
          <Notification
            onDismiss={dismissPartySuccess}
            title="Ação local registrada"
            tone="success"
          >
            {partySuccessMessage}
          </Notification>
        )}
        {partyError && (
          <Notification onDismiss={dismissPartyError} title="Atenção" tone="error">
            {partyError}
          </Notification>
        )}

        {/* Breadcrumb */}
        <Link
          className="mb-4 flex items-center gap-1.5 text-xs text-[var(--text2)] transition hover:text-[var(--teal)]"
          href="/cases"
        >
          <ArrowLeft size={14} />
          Todos os casos
        </Link>

        {/* Case header */}
        <div className="cv-card mb-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-semibold text-brand-teal">
                  {caseData.code}
                </span>
                <StatusBadge status={caseData.status} />
                <PriorityBadge priority={caseData.priority} />
                {paymentPending && <Badge tone="orange">Pagamento pendente</Badge>}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
                {caseDisplayTitle(caseData)}
              </h1>
              <p className="mt-1 text-sm text-[var(--text2)]">
                {caseData.clientName} · {productLabel(caseData.caseType)}
              </p>
              {caseData.notes && (
                <p className="mt-2 text-xs leading-5 text-[var(--text2)]">{caseData.notes}</p>
              )}
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <div className="mb-3 text-left sm:text-right">
                <span className="font-mono text-2xl font-bold tracking-tight text-[var(--text)]">
                  {caseData.progressPercent}%
                </span>
                <p className="text-[11px] text-[var(--text2)]">Progresso geral</p>
              </div>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--surf3)]">
                <div
                  className="h-1.5 rounded-full bg-[var(--teal)]"
                  style={{ width: `${caseData.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <dl className="mt-6 flex flex-wrap gap-6 border-t border-[var(--bd)] pt-4 text-xs">
            {[
              {
                label: "Responsável",
                value: caseData.assignedTo ?? "Não atribuído"
              },
              { label: "Documentos", value: `${summary?.documentsCount ?? caseData.documentsCount}` },
              { label: "Partes", value: `${summary?.partiesCount ?? caseParties.length}` },
              { label: "Risco", value: riskLabel(summary?.riskLevel ?? caseData.riskLevel) },
              {
                label: "Recomendação",
                value: recommendationLabel(caseData.recommendation)
              },
              {
                label: "Origem",
                value: sourceModeLabel(summary?.sourceMode ?? caseData.sourceMode)
              },
              {
                label: "Criado em",
                value: formatDate(caseData.createdAt)
              },
              {
                label: "Atualizado",
                value: formatDate(caseData.updatedAt)
              }
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-[var(--text3)]">{item.label}</dt>
                <dd className="mt-0.5 font-medium text-[var(--text2)]">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex overflow-x-auto border-b border-[var(--bd)]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-medium transition ${
                  active
                    ? "border-[var(--teal)] text-[var(--teal)]"
                    : "border-transparent text-[var(--text2)] hover:text-[var(--text)]"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab: Overview */}
        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-2 animate-in">
            <Card title="Status atual">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-[rgba(32,201,151,0.3)] bg-[var(--teal-dim)]">
                  <span className="font-mono text-sm font-bold text-[var(--teal)]">
                    {caseData.progressPercent}%
                  </span>
                </div>
                <div>
                  <StatusBadge status={caseData.status} />
                  {caseData.assignedTo && (
                    <p className="mt-1.5 text-xs text-[var(--text2)]">
                      Responsável: {caseData.assignedTo}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card title="Estatísticas">
              <dl className="grid grid-cols-2 gap-4">
                {[
                  { label: "Documentos", value: summary?.documentsCount ?? caseData.documentsCount },
                  { label: "Partes", value: summary?.partiesCount ?? caseParties.length },
                  {
                    label: "Triagem",
                    value: triageStatusLabel(summary?.triageStatus)
                  },
                  {
                    label: "Relatório",
                    value: reportStatusLabel(caseReport)
                  }
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-[11px] text-[var(--text3)]">{stat.label}</dt>
                    <dd className="mt-0.5 font-mono text-lg font-bold tracking-tight text-[var(--text)]">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            {showPayment && (
              <CasePaymentCard
                caseId={caseData.id}
                installmentPlan={installmentPlan}
                onPrint={() => setPrintReceipt(true)}
                paymentPending={paymentPending}
                paymentStatus={paymentStatus}
              />
            )}

            <Card className="lg:col-span-2" title="Próximos passos">
              {caseIsCompleted ? (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="shrink-0 text-[var(--teal)]" size={18} />
                  <p className="text-sm text-[var(--text2)]">
                    Caso concluído — relatório aprovado. Nenhuma ação pendente.
                  </p>
                </div>
              ) : paymentPending ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[var(--text2)]">
                    Conclua o pagamento do pedido para liberar a triagem.
                  </p>
                  {canWrite && (
                    <Button
                      href={`/cases/${caseData.id}/pagamento`}
                      icon={<CreditCard aria-hidden="true" size={15} />}
                    >
                      Concluir pagamento
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[var(--text2)]">
                    {!triageHasRun
                      ? "Execute a triagem para coletar as evidências dos provedores."
                      : !caseReport
                        ? "Gere o parecer consolidando as evidências da triagem."
                        : "Revise o parecer e aprove para concluir o caso."}
                  </p>
                  {canWrite ? (
                    !triageHasRun ? (
                      <Button
                        icon={<Play aria-hidden="true" size={15} />}
                        loading={triageRunning}
                        onClick={handleRunTriage}
                      >
                        Rodar triagem
                      </Button>
                    ) : !caseReport ? (
                      <Button
                        icon={<FileText aria-hidden="true" size={15} />}
                        loading={reportBusy}
                        onClick={handleGenerateReport}
                      >
                        Gerar relatório
                      </Button>
                    ) : (
                      <Button
                        icon={<CheckCircle2 aria-hidden="true" size={15} />}
                        onClick={() => setApproveOpen(true)}
                      >
                        Aprovar relatório
                      </Button>
                    )
                  ) : (
                    <span className="text-xs text-[var(--text3)]">Somente admin/analista</span>
                  )}
                </div>
              )}
            </Card>

            {caseData.status === "revisao_humana" && (
              <div className="lg:col-span-2 rounded-lg border border-[rgba(249,115,22,0.25)] bg-[var(--orange-dim)] p-5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="shrink-0 text-[var(--orange)]" size={20} />
                  <div>
                      <p className="text-sm font-semibold text-[var(--text)]">
                      Revisão demonstrativa
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text2)]">
                      Este caso está em etapa demonstrativa de revisão. Revisão
                      humana persistida, aprovação real e entrega ao cliente ficam no
                      roadmap.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Parties */}
        {activeTab === "parties" && (
          <div className="animate-in">
            <div className="mb-4 flex justify-end">
              <Button icon={<Plus aria-hidden="true" size={15} />} onClick={startCreateParty}>
                Adicionar parte
              </Button>
            </div>
            {caseParties.length === 0 ? (
              <EmptyState
                action={
                  <Button icon={<Plus size={15} />} onClick={startCreateParty}>
                    Adicionar parte
                  </Button>
                }
                description="Cadastre partes fictícias vinculadas a este caso para validar o fluxo local."
                icon={<Users size={20} />}
                title="Nenhuma parte registrada"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {caseParties.map((party, index) => (
                  <div
                    className="animate-in"
                    key={party.id}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--bd)] bg-[var(--surf2)] text-xs font-bold text-[var(--teal)]">
                          {party.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text)]">
                            {party.name}
                          </p>
                          <span className="inline-flex rounded-md bg-[var(--surf3)] px-2 py-0.5 text-[11px] text-[var(--text2)]">
                            {partyTypeLabel[party.type] ?? party.type}
                          </span>
                        </div>
                      </div>
                      <Button
                        aria-label={`Editar parte ${party.name}`}
                        icon={<Pencil aria-hidden="true" size={14} />}
                        onClick={() => startEditParty(party)}
                        size="sm"
                        variant="secondary"
                      >
                        Editar
                      </Button>
                    </div>
                    <dl className="mt-4 space-y-2 text-xs">
                      <div className="flex min-w-0 items-center gap-2 text-[var(--text2)]">
                        <FileText size={12} className="shrink-0 text-[var(--text3)]" />
                        <span className="truncate">{party.document || "Documento não informado"}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-2 text-[var(--text2)]">
                        <Mail size={12} className="shrink-0 text-[var(--text3)]" />
                        <span className="truncate">{party.email || "E-mail não informado"}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-2 text-[var(--text2)]">
                        <Phone size={12} className="shrink-0 text-[var(--text3)]" />
                        <span className="truncate">{party.phone || "Telefone não informado"}</span>
                      </div>
                    </dl>
                    {party.notes && (
                      <p className="mt-3 border-t border-[var(--bd)] pt-3 text-xs leading-5 text-[var(--text2)]">
                        {party.notes}
                      </p>
                    )}
                    </Card>
                  </div>
                ))}
              </div>
            )}
            {showPartyForm && (
              <div
                aria-labelledby="party-form-title"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
                role="dialog"
              >
                <form
                  className="cv-card max-h-[calc(100vh-4rem)] w-full max-w-2xl overflow-y-auto p-5 shadow-2xl"
                  onSubmit={handlePartySubmit}
                >
                  <div className="mb-5">
                    <h2 className="text-sm font-semibold text-[var(--text)]" id="party-form-title">
                      {editingParty ? "Editar parte" : "Adicionar parte"}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
                      Use apenas dados fictícios. A referência de organização e caso é validada pela API local quando disponível.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField error={partyFormErrors.name} label="Nome da parte" required>
                      <TextInput
                        invalid={Boolean(partyFormErrors.name)}
                        onChange={(event) => updatePartyForm("name", event.target.value)}
                        placeholder="Parte fictícia"
                        value={partyForm.name}
                      />
                    </FormField>
                    <FormField error={partyFormErrors.party_type} label="Papel" required>
                      <SelectInput
                        invalid={Boolean(partyFormErrors.party_type)}
                        onChange={(event) => updatePartyForm("party_type", event.target.value)}
                        value={partyForm.party_type}
                      >
                        {partyTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SelectInput>
                    </FormField>
                    <FormField
                      error={partyFormErrors.document}
                      hint="Opcional. Use identificadores fictícios em ambiente local."
                      label="Documento"
                    >
                      <TextInput
                        invalid={Boolean(partyFormErrors.document)}
                        onChange={(event) => updatePartyForm("document", event.target.value)}
                        placeholder="00000000000"
                        value={partyForm.document ?? ""}
                      />
                    </FormField>
                    <FormField error={partyFormErrors.email} label="E-mail">
                      <TextInput
                        invalid={Boolean(partyFormErrors.email)}
                        onChange={(event) => updatePartyForm("email", event.target.value)}
                        placeholder="parte@example.test"
                        type="email"
                        value={partyForm.email ?? ""}
                      />
                    </FormField>
                    <FormField label="Telefone">
                      <TextInput
                        onChange={(event) => updatePartyForm("phone", event.target.value)}
                        placeholder="+5500000000000"
                        value={partyForm.phone ?? ""}
                      />
                    </FormField>
                    <FormField label="Observações">
                      <TextArea
                        onChange={(event) => updatePartyForm("notes", event.target.value)}
                        placeholder="Observações fictícias sobre a parte"
                        value={partyForm.notes ?? ""}
                      />
                    </FormField>
                  </div>
                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button disabled={partySubmitting} onClick={resetPartyForm} variant="secondary">
                      Cancelar
                    </Button>
                    <Button loading={partySubmitting} type="submit">
                      {editingParty ? "Salvar alterações" : "Adicionar parte"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Tab: Documents */}
        {activeTab === "documents" && (
          <div className="animate-in space-y-3">
            {caseDocuments.length === 0 ? (
              <EmptyState
                action={
                  <Button href="/documents" variant="secondary">
                    Abrir documentos
                  </Button>
                }
                description="Nenhum metadado de documento foi encontrado para este caso."
                icon={<FileText size={20} />}
                title="Sem documentos"
              />
            ) : (
              caseDocuments.map((doc, index) => (
                <div
                  className="animate-in flex flex-col gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-5 py-4 sm:flex-row sm:items-center sm:gap-4"
                  key={doc.id}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surf3)]">
                    <FileText className="text-[var(--text2)]" size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text)]">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-[var(--text3)]">
                      {doc.sizeLabel} · {formatDate(doc.uploadedAt)}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text3)]">
                      OCR: {doc.ocrStatus ?? "not_started"} · IA: {doc.aiReadStatus ?? "not_started"}
                    </p>
                  </div>
                  <div className="self-start sm:self-center">
                    <StatusBadge status={doc.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Timeline */}
        {activeTab === "timeline" && (
          <div className="animate-in">
            <Card title="Linha do tempo operacional">
              <Timeline events={caseTimeline} />
            </Card>
          </div>
        )}

        {/* Tab: Agents */}
        {activeTab === "agents" && (
          <div className="animate-in">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bot className="text-brand-teal" size={18} />
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  Módulos de triagem do caso
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {providerResults.length > 0 && (
                  <Button
                    icon={<Printer aria-hidden="true" size={15} />}
                    onClick={() => setPrintTarget("all")}
                    variant="secondary"
                  >
                    Imprimir tudo
                  </Button>
                )}
                {canWrite && !caseIsCompleted && !paymentPending && (
                  <Button
                    icon={
                      triageHasRun ? (
                        <RefreshCw aria-hidden="true" size={15} />
                      ) : (
                        <Play aria-hidden="true" size={15} />
                      )
                    }
                    loading={triageRunning}
                    onClick={handleRunTriage}
                  >
                    {triageHasRun ? "Reexecutar triagem" : "Rodar triagem"}
                  </Button>
                )}
              </div>
            </div>
            {triageModules.length === 0 ? (
              <EmptyState
                description="Nenhum módulo de triagem foi registrado para este caso."
                icon={<Bot size={20} />}
                title="Triagem ainda não iniciada"
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {triageModules.map((module, index) => (
                  <div
                    className="animate-in"
                    key={module.id}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <TriageModuleCard
                      module={module}
                      onPrint={setPrintTarget}
                      result={resultByModule.get(module.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Report */}
        {activeTab === "report" && (
          <CaseReportTab
            finalReport={{
              acceptAttr: FINAL_REPORT_ACCEPT_ATTR,
              docs: finalReports,
              error: finalReportError,
              onDownload: (documentId: string) =>
                void handleFinalReportDownload(documentId),
              onUpload: handleFinalReportUpload,
              success: finalReportSuccess,
              uploading: finalReportUploading
            }}
            report={{
              busy: reportBusy,
              canWrite,
              data: caseReport,
              isCompleted: caseIsCompleted,
              onApprove: () => setApproveOpen(true),
              onGenerate: handleGenerateReport,
              paymentPending
            }}
          />
        )}
        <TriagePrintSheet
          caseCode={caseData.code}
          caseTitle={caseDisplayTitle(caseData)}
          clientName={caseData.clientName}
          modules={triageModules}
          resultByModule={resultByModule}
          target={printTarget}
        />
        <PaymentReceiptSheet
          active={printReceipt}
          caseCode={caseData.code}
          caseTitle={caseDisplayTitle(caseData)}
          plan={installmentPlan}
        />
        <ConfirmDialog
          cancelLabel="Cancelar"
          confirmLabel="Aprovar e concluir"
          description="Aprovar registra a revisão humana e conclui o caso (status 'completed'). Um caso finalizado não aceita novas escritas."
          loading={approving}
          onCancel={() => setApproveOpen(false)}
          onConfirm={handleApproveReport}
          open={approveOpen}
          title="Aprovar relatório do caso?"
          variant="primary"
        />
      </AppLayout>
    </AuthGuard>
  );
}
