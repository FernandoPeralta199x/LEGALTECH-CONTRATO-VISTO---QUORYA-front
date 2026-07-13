"use client";

import {
  ArrowLeft,
  Bot,
  ClipboardList,
  Clock,
  FileText,
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
import { CaseAgentsTab } from "@/components/cases/CaseAgentsTab";
import { CaseOverviewTab } from "@/components/cases/CaseOverviewTab";
import { CasePartiesTab } from "@/components/cases/CasePartiesTab";
import { CaseReportTab } from "@/components/cases/CaseReportTab";
import { PaymentReceiptSheet } from "@/components/cases/PaymentReceiptSheet";
import { TriagePrintSheet } from "@/components/cases/TriagePrintSheet";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Notification } from "@/components/Notification";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { caseDisplayTitle, formatDate } from "@/lib/formatters";
import { errorMessage } from "@/lib/errorMessage";
import {
  aggregatePartyFromCaseParty,
  useCasePartiesEditor
} from "@/lib/useCasePartiesEditor";
import { getCaseAggregate } from "@/services/cases";
import {
  generateCaseReport,
  reviewCaseReport,
  runCaseTriage
} from "@/services/caseWorkflow";
import { useDevSession } from "@/lib/useDevSession";
import { usePrintOnChange } from "@/lib/usePrintOnChange";
import {
  productLabel,
  recommendationLabel,
  riskLabel
} from "@/lib/reportLabels";
import {
  FINAL_REPORT_ACCEPT_ATTR,
  FINAL_REPORT_ACCEPTED_MIME,
  getFinalReportDownloadUrl,
  listFinalReports,
  uploadFinalReport,
  type FinalReportDocument
} from "@/services/finalReports";
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
    // M16: updater PURO. Antes, setCaseData/setCaseAggregate eram chamados DENTRO do
    // updater de setCaseParties — em React StrictMode o updater é invocado 2x (para
    // detectar impureza), disparando os setState aninhados em duplicidade. Agora
    // calculamos `next` do valor atual e disparamos os três setState no nível do
    // handler; cada um continua com um updater próprio e puro.
    const next = updater(caseParties);
    setCaseParties(next);
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
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCase();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshCase]);

  // Impressão/PDF: dispara o print e limpa o estado da folha no afterprint (usePrintOnChange).
  usePrintOnChange(printTarget, () => setPrintTarget(null)); // evidências (TriagePrintSheet)
  usePrintOnChange(printReceipt, () => setPrintReceipt(false)); // comprovante (PaymentReceiptSheet)

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

        {/* Tabs (padrão ARIA Tabs — A11Y-05) */}
        <div
          aria-label="Seções do caso"
          className="mb-6 flex overflow-x-auto border-b border-[var(--bd)]"
          onKeyDown={(event) => {
            const i = TABS.findIndex((t) => t.id === activeTab);
            let nextIndex: number;
            if (event.key === "ArrowRight") nextIndex = (i + 1) % TABS.length;
            else if (event.key === "ArrowLeft")
              nextIndex = (i - 1 + TABS.length) % TABS.length;
            else if (event.key === "Home") nextIndex = 0;
            else if (event.key === "End") nextIndex = TABS.length - 1;
            else return;
            event.preventDefault();
            const next = TABS[nextIndex];
            setActiveTab(next.id);
            document.getElementById(`tab-${next.id}`)?.focus();
          }}
          role="tablist"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                aria-controls={active ? `panel-${tab.id}` : undefined}
                aria-selected={active}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs transition ${
                  active
                    ? "border-[var(--teal)] font-semibold text-[var(--teal)]"
                    : "border-transparent font-medium text-[var(--text2)] hover:text-[var(--text)]"
                }`}
                id={`tab-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                tabIndex={active ? 0 : -1}
                type="button"
              >
                <Icon aria-hidden="true" size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          aria-labelledby={`tab-${activeTab}`}
          id={`panel-${activeTab}`}
          role="tabpanel"
          tabIndex={0}
        >
        {/* Tab: Overview */}
        {activeTab === "overview" && (
          <CaseOverviewTab
            canWrite={canWrite}
            caseData={caseData}
            caseIsCompleted={caseIsCompleted}
            caseParties={caseParties}
            caseReport={caseReport}
            installmentPlan={installmentPlan}
            onGenerateReport={handleGenerateReport}
            onOpenApprove={() => setApproveOpen(true)}
            onPrintReceipt={() => setPrintReceipt(true)}
            onRunTriage={handleRunTriage}
            paymentPending={paymentPending}
            paymentStatus={paymentStatus}
            reportBusy={reportBusy}
            showPayment={showPayment}
            summary={summary}
            triageHasRun={triageHasRun}
            triageRunning={triageRunning}
          />
        )}

        {/* Tab: Parties */}
        {activeTab === "parties" && (
          <CasePartiesTab
            caseParties={caseParties}
            editingParty={editingParty}
            handlePartySubmit={handlePartySubmit}
            partyForm={partyForm}
            partyFormErrors={partyFormErrors}
            partySubmitting={partySubmitting}
            resetPartyForm={resetPartyForm}
            showPartyForm={showPartyForm}
            startCreateParty={startCreateParty}
            startEditParty={startEditParty}
            updatePartyForm={updatePartyForm}
          />
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
          <CaseAgentsTab
            canWrite={canWrite}
            caseIsCompleted={caseIsCompleted}
            onPrint={setPrintTarget}
            onRunTriage={handleRunTriage}
            paymentPending={paymentPending}
            providerResults={providerResults}
            resultByModule={resultByModule}
            triageHasRun={triageHasRun}
            triageModules={triageModules}
            triageRunning={triageRunning}
          />
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
        </div>
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
