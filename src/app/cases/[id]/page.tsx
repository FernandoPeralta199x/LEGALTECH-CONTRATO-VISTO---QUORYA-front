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
  Download,
  FileText,
  Mail,
  Pencil,
  Phone,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Shield,
  Upload,
  Users
} from "lucide-react";
import type { FormEvent } from "react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { centsToReaisLabel } from "@/components/CurrencyInput";
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
import { formatBytes, caseDisplayTitle, formatDate } from "@/lib/formatters";
import { errorMessage } from "@/src/lib/errorMessage";
import { isValidEmail } from "@/src/lib/validation";
import {
  createCaseParty,
  updateCaseParty
} from "@/src/services/caseParties";
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
  CasePartyCreate,
  CasePartyUpdate,
  Document,
  ProviderResult,
  Report
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

const emptyPartyForm: CasePartyCreate = {
  document: "",
  email: "",
  name: "",
  notes: "",
  party_type: "cliente",
  phone: ""
};

type PageProps = { params: Promise<{ id: string }> };
type PartyFormErrors = Partial<Record<keyof CasePartyCreate, string>>;

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

const paymentMethodLabel: Record<string, string> = {
  boleto: "Boleto",
  cartao: "Cartão",
  pix: "Pix"
};

const paymentStatusLabel: Record<string, string> = {
  canceled: "Cancelado",
  expired: "Expirado",
  failed: "Falhou",
  paid: "Pago",
  pending: "Pendente",
  refunded: "Reembolsado",
  simulated: "Simulado"
};

/** Formata "AAAA-MM-DD" como dd/mm/aaaa sem passar por Date (evita shift de fuso). */
function formatDueDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

function reportStatusLabel(report: Report | null): string {
  if (!report) return "Não gerado";

  const labels: Record<string, string> = {
    failed: "Falhou",
    generating: "Gerando",
    not_started: "Não iniciado",
    ready: "Pronto",
    in_review: "Em revisão",
    approved: "Aprovado",
    rejected: "Rejeitado",
    delivered: "Entregue",
    draft: "Rascunho"
  };

  return labels[report.status] ?? report.status;
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

function validatePartyForm(form: CasePartyCreate): PartyFormErrors {
  const errors: PartyFormErrors = {};
  const document = form.document?.trim() ?? "";
  const email = form.email?.trim() ?? "";

  if (!form.name.trim()) {
    errors.name = "Informe o nome da parte.";
  }

  if (!form.party_type.trim()) {
    errors.party_type = "Selecione o papel da parte.";
  }

  if (document && !/^[A-Za-z0-9./-]+$/.test(document)) {
    errors.document = "Use apenas números, letras, pontos, barras ou hífens.";
  }

  if (email && !isValidEmail(email)) {
    errors.email = "Informe um e-mail válido ou deixe o campo vazio.";
  }

  return errors;
}

function buildPartyPayload(form: CasePartyCreate): CasePartyCreate {
  return {
    document: form.document?.trim() || null,
    email: form.email?.trim() || null,
    name: form.name.trim(),
    notes: form.notes?.trim() || null,
    party_type: form.party_type,
    phone: form.phone?.trim() || null
  };
}

function partyFormFromParty(party: CaseParty): CasePartyCreate {
  return {
    document: party.document ?? "",
    email: party.email ?? "",
    name: party.name,
    notes: party.notes ?? "",
    party_type: party.type,
    phone: party.phone ?? ""
  };
}

function aggregatePartyFromCaseParty(
  party: CaseParty,
  fallbackOrganizationId: string
): CaseAggregate["parties"][number] {
  return {
    ...party,
    organizationId: party.organizationId ?? fallbackOrganizationId,
    role: typeof party.metadata?.role === "string" ? party.metadata.role : party.type
  };
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
  const [editingParty, setEditingParty] = useState<CaseParty | null>(null);
  const [error, setError] = useState("");
  const [fallbackReason, setFallbackReason] = useState("");
  const [aggregateSource, setAggregateSource] = useState<"api" | "mock">("api");
  const [loading, setLoading] = useState(true);
  const [partyError, setPartyError] = useState("");
  const [partyForm, setPartyForm] = useState<CasePartyCreate>(emptyPartyForm);
  const [partyFormErrors, setPartyFormErrors] = useState<PartyFormErrors>({});
  const [partySubmitting, setPartySubmitting] = useState(false);
  const [partySuccessMessage, setPartySuccessMessage] = useState("");
  const [showPartyForm, setShowPartyForm] = useState(false);
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
  const [showReceipt, setShowReceipt] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(false);
  const [workflowNotice, setWorkflowNotice] = useState<{
    tone: "success" | "error";
    title: string;
    description: string;
  } | null>(null);

  const refreshFinalReports = useCallback(async () => {
    try {
      const reports = await listFinalReports(id);
      setFinalReports(reports);
    } catch (err) {
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
    setLoading(true);
    setError("");

    try {
      const aggregateResult = await getCaseAggregate(id);
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
      setError(errorMessage(err));
      setFallbackReason("");
      setCaseAggregate(null);
      setCaseData(null);
      setCaseDocuments([]);
      setCaseParties([]);
    } finally {
      setLoading(false);
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

  function resetPartyForm() {
    setEditingParty(null);
    setPartyForm(emptyPartyForm);
    setPartyFormErrors({});
    setPartyError("");
    setShowPartyForm(false);
  }

  function startCreateParty() {
    setEditingParty(null);
    setPartyForm(emptyPartyForm);
    setPartyFormErrors({});
    setPartyError("");
    setPartySuccessMessage("");
    setShowPartyForm(true);
  }

  function startEditParty(party: CaseParty) {
    setEditingParty(party);
    setPartyForm(partyFormFromParty(party));
    setPartyFormErrors({});
    setPartyError("");
    setPartySuccessMessage("");
    setShowPartyForm(true);
  }

  function updatePartyForm<K extends keyof CasePartyCreate>(
    field: K,
    value: CasePartyCreate[K]
  ) {
    setPartyForm((current) => ({ ...current, [field]: value }));
    setPartyFormErrors((current) => ({ ...current, [field]: "" }));
    setPartyError("");
    setPartySuccessMessage("");
  }

  async function handlePartySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (partySubmitting) {
      return;
    }

    const validationErrors = validatePartyForm(partyForm);
    setPartyFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setPartyError("Revise os campos destacados antes de registrar a parte local.");
      return;
    }

    setPartySubmitting(true);
    setPartyError("");
    setPartySuccessMessage("");

    try {
      const payload = buildPartyPayload(partyForm);
      const result = editingParty
        ? await updateCaseParty(id, editingParty.id, payload as CasePartyUpdate)
        : await createCaseParty(id, payload);

      syncCaseParties((current) =>
        editingParty
          ? current.map((party) =>
              party.id === result.data.id ? result.data : party
            )
          : [result.data, ...current]
      );
      setFallbackReason(result.source === "mock" ? result.fallbackReason ?? "" : "");
      setPartySuccessMessage(
        result.source === "mock"
          ? editingParty
            ? "Registro local de parte atualizado no fallback de desenvolvimento."
            : "Registro local de parte criado no fallback de desenvolvimento."
          : editingParty
            ? "Registro de parte atualizado pela API local."
            : "Registro de parte criado pela API local."
      );
      resetPartyForm();
    } catch (err) {
      setPartyError(errorMessage(err));
    } finally {
      setPartySubmitting(false);
    }
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
            onDismiss={() => setPartySuccessMessage("")}
            title="Ação local registrada"
            tone="success"
          >
            {partySuccessMessage}
          </Notification>
        )}
        {partyError && (
          <Notification onDismiss={() => setPartyError("")} title="Atenção" tone="error">
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
                <span className="text-xs font-semibold text-brand-teal">
                  {caseData.code}
                </span>
                <StatusBadge status={caseData.status} />
                <PriorityBadge priority={caseData.priority} />
                {paymentPending && <Badge tone="orange">Pagamento pendente</Badge>}
              </div>
              <h1 className="text-xl font-bold text-[var(--text)]">
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
                <span className="text-2xl font-bold text-[var(--text)]">
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
                  <span className="text-sm font-bold text-[var(--teal)]">
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
                    <dd className="mt-0.5 text-lg font-bold text-[var(--text)]">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            {showPayment && (
              <Card
                className="lg:col-span-2"
                title={
                  <span className="flex items-center gap-2">
                    <CreditCard size={16} style={{ color: "var(--accent)" }} />
                    Pagamento
                  </span>
                }
              >
                {installmentPlan ? (
                  <div>
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[
                        {
                          label: "Parcelas",
                          value: `${installmentPlan.parcelas}x de ${centsToReaisLabel(
                            installmentPlan.schedule[0]?.valorCents ??
                              installmentPlan.valorTotalCents
                          )}`
                        },
                        {
                          label: "Valor total",
                          value: centsToReaisLabel(installmentPlan.valorTotalCents)
                        },
                        {
                          label: "Método",
                          value:
                            paymentMethodLabel[installmentPlan.method] ??
                            installmentPlan.method
                        },
                        {
                          label: "Status",
                          value: paymentStatusLabel[paymentStatus] ?? paymentStatus
                        }
                      ].map((item) => (
                        <div key={item.label}>
                          <dt className="text-[11px] text-[var(--text3)]">
                            {item.label}
                          </dt>
                          <dd className="mt-0.5 text-sm font-semibold text-[var(--text)]">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {installmentPlan.hasJuros && (
                      <p className="mt-3 text-[11px] text-[var(--text3)]">
                        Juros de{" "}
                        {(installmentPlan.jurosMensalBps / 100).toLocaleString(
                          "pt-BR",
                          { maximumFractionDigits: 2 }
                        )}
                        % a.m. · acréscimo de{" "}
                        {centsToReaisLabel(installmentPlan.acrescimoCents)}
                      </p>
                    )}
                    {installmentPlan.schedule.length > 0 && (
                      <div className="mt-4 border-t border-[var(--bd)] pt-4">
                        <p className="mb-2 text-[11px] uppercase tracking-wide text-[var(--text3)]">
                          Cronograma
                        </p>
                        <div className="space-y-1.5">
                          {installmentPlan.schedule.map((item) => (
                            <div
                              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-1.5 text-xs"
                              key={item.numero}
                            >
                              <span className="text-[var(--text2)]">
                                Parcela {item.numero}
                              </span>
                              <span className="text-[var(--text2)]">
                                {formatDueDate(item.vencimento)}
                              </span>
                              <span className="font-semibold text-[var(--text)]">
                                {centsToReaisLabel(item.valorCents)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex justify-end">
                      <Button
                        icon={<CheckCircle2 aria-hidden="true" size={15} />}
                        onClick={() => setShowReceipt((v) => !v)}
                        variant="secondary"
                      >
                        {showReceipt ? "Ocultar comprovante" : "Ver comprovante"}
                      </Button>
                    </div>
                    {showReceipt && (
                      <div className="mt-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className="shrink-0 text-[var(--teal)]"
                            size={18}
                          />
                          <p className="text-sm font-semibold text-[var(--text)]">
                            {(installmentPlan.payment?.simulated ?? true)
                              ? "Pagamento simulado confirmado"
                              : "Pagamento confirmado"}
                          </p>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--text3)]">
                          Ambiente local — nenhuma cobrança real foi gerada.
                        </p>
                        <dl className="mt-3 space-y-1.5 text-xs">
                          <div className="flex justify-between gap-4">
                            <dt className="text-[var(--text3)]">Método</dt>
                            <dd className="text-right font-medium text-[var(--text)]">
                              {paymentMethodLabel[installmentPlan.method] ??
                                installmentPlan.method}
                              {installmentPlan.method === "cartao" &&
                              installmentPlan.payment?.last4
                                ? ` · ${
                                    installmentPlan.payment.brand
                                      ? installmentPlan.payment.brand + " "
                                      : ""
                                  }•••• ${installmentPlan.payment.last4}`
                                : ""}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-[var(--text3)]">Parcelas</dt>
                            <dd className="text-right font-medium text-[var(--text)]">
                              {installmentPlan.parcelas}x
                            </dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-[var(--text3)]">Valor total</dt>
                            <dd className="text-right font-medium text-[var(--text)]">
                              {centsToReaisLabel(installmentPlan.valorTotalCents)}
                            </dd>
                          </div>
                          {installmentPlan.payment?.authorizationCode && (
                            <div className="flex justify-between gap-4">
                              <dt className="text-[var(--text3)]">Autorização</dt>
                              <dd className="text-right font-medium text-[var(--text)]">
                                {installmentPlan.payment.authorizationCode}
                              </dd>
                            </div>
                          )}
                          {installmentPlan.payment?.externalReference && (
                            <div className="flex justify-between gap-4">
                              <dt className="text-[var(--text3)]">Referência</dt>
                              <dd className="break-all text-right font-medium text-[var(--text)]">
                                {installmentPlan.payment.externalReference}
                              </dd>
                            </div>
                          )}
                          {installmentPlan.payment?.requestedAt && (
                            <div className="flex justify-between gap-4">
                              <dt className="text-[var(--text3)]">Data</dt>
                              <dd className="text-right font-medium text-[var(--text)]">
                                {new Date(
                                  installmentPlan.payment.requestedAt
                                ).toLocaleString("pt-BR")}
                              </dd>
                            </div>
                          )}
                        </dl>
                        <div className="mt-4 flex justify-end">
                          <Button
                            icon={<Printer aria-hidden="true" size={15} />}
                            onClick={() => setPrintReceipt(true)}
                            variant="secondary"
                          >
                            Imprimir / salvar PDF
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : paymentPending ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[var(--text2)]">
                      O pagamento deste caso ainda está pendente. Conclua para
                      registrar o plano de parcelamento.
                    </p>
                    <Button
                      href={`/cases/${caseData.id}/pagamento`}
                      icon={<CreditCard aria-hidden="true" size={15} />}
                    >
                      Concluir pagamento
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text2)]">
                    Status do pagamento:{" "}
                    {paymentStatusLabel[paymentStatus] ?? paymentStatus}.
                  </p>
                )}
              </Card>
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
                {caseParties.map((party) => (
                  <Card key={party.id}>
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
              caseDocuments.map((doc) => (
                <div
                  className="flex flex-col gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-5 py-4 sm:flex-row sm:items-center sm:gap-4"
                  key={doc.id}
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
                {triageModules.map((module) => (
                  <TriageModuleCard
                    key={module.id}
                    module={module}
                    onPrint={setPrintTarget}
                    result={resultByModule.get(module.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Report */}
        {activeTab === "report" && (
          <div className="animate-in space-y-6">
            {/* Final report upload + list (always visible) */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Upload size={18} style={{ color: "var(--accent)" }} />
                <h3 className="text-sm font-bold text-[var(--text)]">
                  Relatório final do analista
                </h3>
              </div>
              <p className="text-xs text-[var(--text2)] mb-4">
                Faça upload do relatório jurídico finalizado pelo analista.
                Aceita PDF, DOCX ou TXT (máx. 25 MB). Ficará vinculado ao caso e
                disponível para download posterior.
              </p>

              {finalReportError && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <AlertTriangle size={14} />
                  {finalReportError}
                </div>
              )}
              {finalReportSuccess && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-[rgba(32,201,151,0.3)] bg-[var(--teal-dim)] px-3 py-2 text-xs text-[var(--teal)]">
                  <CheckCircle2 size={14} />
                  {finalReportSuccess}
                </div>
              )}

              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--bd2)] bg-[var(--surf2)] px-4 py-6 text-sm font-medium text-[var(--text2)] transition hover:border-[var(--accent)] hover:bg-[var(--surf3)] ${
                  finalReportUploading ? "pointer-events-none opacity-60" : ""
                }`}
              >
                <Upload size={16} />
                {finalReportUploading
                  ? "Enviando..."
                  : "Selecionar arquivo (PDF, DOCX, TXT)"}
                <input
                  accept={FINAL_REPORT_ACCEPT_ATTR}
                  className="hidden"
                  disabled={finalReportUploading}
                  onChange={handleFinalReportUpload}
                  type="file"
                />
              </label>

              {finalReports.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text3)]">
                    Relatórios enviados ({finalReports.length})
                  </p>
                  {finalReports.map((doc) => (
                    <div
                      className="flex items-center gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-4 py-3"
                      key={doc.id}
                    >
                      <FileText
                        className="shrink-0 text-[var(--text2)]"
                        size={16}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text)]">
                          {doc.filename}
                        </p>
                        <p className="text-[11px] text-[var(--text3)]">
                          {formatBytes(doc.sizeBytes)}
                          {doc.uploadedAt
                            ? ` · ${formatDate(doc.uploadedAt)}`
                            : ""}
                        </p>
                      </div>
                      <button
                        className="cv-icon-btn"
                        onClick={() => void handleFinalReportDownload(doc.id)}
                        title="Baixar"
                        type="button"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* AI-generated preliminary report */}
            {!caseReport ? (
              <EmptyState
                action={
                  canWrite && !paymentPending ? (
                    <Button
                      icon={<FileText aria-hidden="true" size={15} />}
                      loading={reportBusy}
                      onClick={handleGenerateReport}
                    >
                      Gerar relatório
                    </Button>
                  ) : undefined
                }
                description="O resumo demonstrativo ainda não está disponível. Gere o parecer a partir das evidências da triagem."
                icon={<Shield size={20} />}
                title="Relatório preliminar não disponível"
              />
            ) : (
              <div className="space-y-6">
                <Card>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-[var(--text)]">
                        {caseReport.title}
                      </h2>
                      <p className="mt-1 text-[11px] text-[var(--text3)]">
                        Versão {caseReport.version} ·{" "}
                        {formatDate(caseReport.generatedAt)}
                      </p>
                    </div>
                    <StatusBadge status={caseReport.status} />
                  </div>

                  {canWrite && !caseIsCompleted && (
                    <div className="mb-5 flex flex-wrap gap-2">
                      <Button
                        icon={<RefreshCw aria-hidden="true" size={15} />}
                        loading={reportBusy}
                        onClick={handleGenerateReport}
                        variant="secondary"
                      >
                        Regerar relatório
                      </Button>
                      <Button
                        disabled={reportBusy}
                        icon={<CheckCircle2 aria-hidden="true" size={15} />}
                        onClick={() => setApproveOpen(true)}
                      >
                        Aprovar relatório
                      </Button>
                    </div>
                  )}

                  {caseReport.status === "in_review" && (
                    <div className="mb-5 flex items-center gap-3 rounded-lg border border-[rgba(249,115,22,0.25)] bg-[var(--orange-dim)] px-4 py-3">
                      <AlertTriangle className="shrink-0 text-[var(--orange)]" size={16} />
                      <p className="text-xs text-[var(--text2)]">
                        Este relatório está em revisão demonstrativa. Validação
                        humana persistida, aprovação real e entrega ao cliente ficam
                        no roadmap.
                      </p>
                    </div>
                  )}

                  <p className="text-sm leading-6 text-[var(--text2)]">
                    {caseReport.summary}
                  </p>
                  <dl className="mt-5 grid gap-3 border-t border-[var(--bd)] pt-4 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="text-[var(--text3)]">Recomendação</dt>
                      <dd className="mt-0.5 font-semibold text-[var(--text)]">
                        {recommendationLabel(caseReport.recommendation)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text3)]">Confiança</dt>
                      <dd className="mt-0.5 font-semibold text-[var(--text)]">
                        {typeof caseReport.confidence === "number"
                          ? `${(caseReport.confidence * 100).toFixed(0)}%`
                          : "Não informado"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text3)]">Status</dt>
                      <dd className="mt-0.5 font-semibold text-[var(--text)]">
                        {reportStatusLabel(caseReport)}
                      </dd>
                    </div>
                  </dl>
                </Card>

                {caseReport.risks.length > 0 && (
                  <Card title="Indicadores demonstrativos de risco">
                    <div className="space-y-4">
                      {caseReport.risks.map((risk) => (
                        <div
                          className={`rounded-lg border p-4 ${
                            risk.level === "high"
                              ? "border-red-500/20 bg-red-500/5"
                              : risk.level === "medium"
                              ? "border-[rgba(249,115,22,0.2)] bg-[var(--orange-dim)]"
                              : "border-[rgba(32,201,151,0.2)] bg-[var(--teal-dim)]"
                          }`}
                          key={risk.id}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <StatusBadge status={risk.level} />
                            <p className="text-sm font-semibold text-[var(--text)]">
                              {risk.title}
                            </p>
                          </div>
                          <p className="text-xs leading-5 text-[var(--text2)]">
                            {risk.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {caseReport.recommendations.length > 0 && (
                  <Card title="Recomendações">
                    <ul className="space-y-2">
                      {caseReport.recommendations.map((rec, i) => (
                        <li className="flex items-start gap-3" key={i}>
                          <CheckCircle2
                            className="mt-0.5 shrink-0 text-[var(--teal)]"
                            size={14}
                          />
                          <p className="text-xs leading-5 text-[var(--text2)]">
                            {recommendationLabel(rec)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {caseReport.limitations && caseReport.limitations.length > 0 && (
                  <Card title="Limitações">
                    <ul className="space-y-2">
                      {caseReport.limitations.map((limitation, index) => (
                        <li className="text-xs leading-5 text-[var(--text2)]" key={index}>
                          {limitation}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {caseReport.sourceRefs && caseReport.sourceRefs.length > 0 && (
                  <Card title="Fontes utilizadas">
                    <ul className="space-y-2">
                      {caseReport.sourceRefs.map((sourceRef, index) => (
                        <li className="text-xs leading-5 text-[var(--text2)]" key={index}>
                          {sourceRef}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                <div className="flex items-center gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] p-4">
                  <FileText className="shrink-0 text-[var(--text3)]" size={16} />
                  <p className="text-xs text-[var(--text2)]">
                    PDF/exportação real ainda não está implementado nesta versão;
                    permanece como etapa planejada do roadmap.
                  </p>
                  <span className="ml-auto shrink-0 cv-badge cv-badge-muted">
                    Roadmap
                  </span>
                </div>
              </div>
            )}
          </div>
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
