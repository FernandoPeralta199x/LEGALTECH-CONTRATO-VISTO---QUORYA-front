"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";

import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CaseAgentsTab } from "@/components/cases/CaseAgentsTab";
import { CaseDetailHeader } from "@/components/cases/CaseDetailHeader";
import { CaseDocumentsTab } from "@/components/cases/CaseDocumentsTab";
import { CaseOverviewTab } from "@/components/cases/CaseOverviewTab";
import { CasePartiesTab } from "@/components/cases/CasePartiesTab";
import { CaseReportTab } from "@/components/cases/CaseReportTab";
import { CaseTabsNav, CASE_TAB_IDS } from "@/components/cases/CaseTabsNav";
import { PaymentReceiptSheet } from "@/components/cases/PaymentReceiptSheet";
import { TriagePrintSheet } from "@/components/cases/TriagePrintSheet";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Notification } from "@/components/Notification";
import { Timeline } from "@/components/Timeline";
import { caseDisplayTitle } from "@/lib/formatters";
import { useCaseDetail } from "@/lib/useCaseDetail";
import { useCasePartiesEditor } from "@/lib/useCasePartiesEditor";
import { useCaseWorkflow } from "@/lib/useCaseWorkflow";
import { useSession } from "@/lib/useSession";
import { usePrintOnChange } from "@/lib/usePrintOnChange";
import { FINAL_REPORT_ACCEPT_ATTR } from "@/services/finalReports";

type PageProps = { params: Promise<{ id: string }> };

export default function CaseDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("overview");
  // Deep-link de aba via hash (ex.: /cases/{id}#documents abre direto a aba Documentos,
  // usado pelas ações rápidas da fila do Analista).
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (CASE_TAB_IDS.includes(hash)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- o fragmento (#tab) só existe no cliente e não chega ao servidor; é uma sincronização única no mount, sem loop.
      setActiveTab(hash);
    }
  }, []);

  // Dados do caso (agregado + documentos + partes + relatórios finais) e o
  // carregamento com guarda de corrida.
  const {
    caseAggregate,
    caseData,
    caseDocuments,
    caseParties,
    error,
    fallbackReason,
    aggregateSource,
    loading,
    finalReports,
    finalReportUploading,
    finalReportFeedback,
    refreshCase,
    syncCaseParties,
    setFallbackReason,
    handleFinalReportUpload,
    handleFinalReportDownload
  } = useCaseDetail(id);

  // Formulário de partes (criar/editar/validar/submeter) — a página segue dona da
  // lista (syncCaseParties, do hook de dados).
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

  const session = useSession();
  const canWrite = session ? ["admin", "analyst"].includes(session.role) : false;

  // Ações de workflow (triagem / gerar relatório / aprovar) e o estado só delas.
  const {
    triageRunning,
    reportBusy,
    approving,
    approveOpen,
    workflowNotice,
    runTriage,
    generateReport,
    approveReport,
    openApprove,
    closeApprove,
    dismissNotice
  } = useCaseWorkflow(id, refreshCase);

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
            description="Não foi possível carregar o detalhe do caso. Verifique se está logado com permissões adequadas e se o servidor está disponível."
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
        {/* SEC-FE-02: banner dirigido por `source` (verdade estrutural), não pela string
            opcional fallbackReason — assim um retorno mock JAMAIS renderiza sem aviso,
            mesmo que alguém esqueça de preencher o motivo. */}
        {aggregateSource === "mock" && (
          <Notification title="Dados possivelmente desatualizados" tone="warning">
            {fallbackReason ||
              "Estes detalhes podem não estar sincronizados com o servidor."}
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
            onDismiss={dismissNotice}
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

        <CaseDetailHeader
          caseData={caseData}
          caseParties={caseParties}
          paymentPending={paymentPending}
          summary={summary}
        />

        <CaseTabsNav activeTab={activeTab} onTabChange={setActiveTab} />

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
              onGenerateReport={generateReport}
              onOpenApprove={openApprove}
              onPrintReceipt={() => setPrintReceipt(true)}
              onRunTriage={runTriage}
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
          {activeTab === "documents" && <CaseDocumentsTab documents={caseDocuments} />}

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
              onRunTriage={runTriage}
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
                error: finalReportFeedback?.kind === "error" ? finalReportFeedback.text : "",
                onDownload: (documentId: string) =>
                  void handleFinalReportDownload(documentId),
                onUpload: handleFinalReportUpload,
                success: finalReportFeedback?.kind === "success" ? finalReportFeedback.text : "",
                uploading: finalReportUploading
              }}
              report={{
                busy: reportBusy,
                canWrite,
                data: caseReport,
                isCompleted: caseIsCompleted,
                onApprove: openApprove,
                onGenerate: generateReport,
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
          onCancel={closeApprove}
          onConfirm={approveReport}
          open={approveOpen}
          title="Aprovar relatório do caso?"
          variant="primary"
        />
      </AppLayout>
    </AuthGuard>
  );
}
