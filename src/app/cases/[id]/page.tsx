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
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";

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
import { useCasePartiesEditor } from "@/lib/useCasePartiesEditor";
import { useCaseDetail } from "@/lib/useCaseDetail";
import { useCaseWorkflow } from "@/lib/useCaseWorkflow";
import { useFinalReports } from "@/lib/useFinalReports";
import { useDevSession } from "@/lib/useDevSession";
import { usePrintOnChange } from "@/lib/usePrintOnChange";
import {
  productLabel,
  recommendationLabel,
  riskLabel,
  sourceModeLabel
} from "@/lib/reportLabels";
import { FINAL_REPORT_ACCEPT_ATTR } from "@/services/finalReports";

const TABS = [
  { id: "overview", label: "Visão geral", icon: ClipboardList },
  { id: "parties", label: "Partes", icon: Users },
  { id: "documents", label: "Documentos", icon: FileText },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "agents", label: "Triagem local", icon: Bot },
  { id: "report", label: "Relatório", icon: Shield }
];

type PageProps = { params: Promise<{ id: string }> };

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

  // Token de carga COMPARTILHADO entre a carga do agregado (useCaseDetail) e a listagem de
  // relatórios finais (useFinalReports): um novo refresh do caso invalida uma listagem em
  // voo, evitando exibir dados/relatórios do caso errado numa troca rápida de id.
  const loadTokenRef = useRef(0);

  const {
    finalReports,
    finalReportUploading,
    finalReportError,
    finalReportSuccess,
    refreshFinalReports,
    handleFinalReportUpload,
    handleFinalReportDownload
  } = useFinalReports({ caseId: id, loadTokenRef });

  const {
    caseAggregate,
    caseData,
    caseDocuments,
    caseParties,
    error,
    fallbackReason,
    aggregateSource,
    loading,
    refreshCase,
    syncCaseParties,
    setFallbackReason
  } = useCaseDetail({ id, loadTokenRef, onAggregateLoaded: refreshFinalReports });

  // Formulário de partes (criar/editar/validar/submeter) extraído para hook próprio —
  // a lista continua em useCaseDetail (syncCaseParties = applyParties).
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

  const session = useDevSession();
  const canWrite = session ? ["admin", "analyst"].includes(session.role) : false;

  const {
    triageRunning,
    reportBusy,
    approveOpen,
    approving,
    workflowNotice,
    setApproveOpen,
    setWorkflowNotice,
    handleRunTriage,
    handleGenerateReport,
    handleApproveReport
  } = useCaseWorkflow({ caseId: id, refreshCase });

  const [printTarget, setPrintTarget] = useState<string | null>(null);
  const [printReceipt, setPrintReceipt] = useState(false);

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
