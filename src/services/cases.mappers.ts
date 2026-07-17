/**
 * Mappers do domínio de casos — convertem os DTOs crus do backend
 * (cases.dto.ts) para os tipos de domínio do front, e montam o payload do
 * wizard operacional. Funções puras, sem I/O.
 */
import {
  MODULOS,
  PRODUTOS,
  type Modulo,
  type Produto
} from "@/lib/produtoConfig";
import { formatBytes } from "@/lib/formatters";
import type {
  Case,
  CaseAggregate,
  CaseListFilters,
  CaseOperationSummary,
  Client,
  Document,
  InstallmentPlan,
  LegalRequest,
  Party,
  PaymentMethod,
  PaymentStatus,
  ProviderResult,
  ProductType,
  Report,
  TimelineEvent,
  TriageModule
} from "@/types";
import type { LocalCaseWizardInput } from "@/lib/localCases";
import type {
  BackendAggregateCase,
  BackendAggregateDocument,
  BackendAggregateParty,
  BackendAggregateProviderResult,
  BackendAggregateReport,
  BackendAggregateSummary,
  BackendAggregateTimelineEvent,
  BackendAggregateTriageModule,
  BackendCase,
  BackendCaseAggregate,
  BackendCaseListPage,
  BackendCaseListPayload,
  BackendInstallmentPlan,
  BackendLegalRequest,
  BackendOperationalCase,
  BackendWizardSubmitResponse
} from "./cases.dto";

export type WizardOperationalSubmitInput = LocalCaseWizardInput & {
  idempotencyKey: string;
  clientId?: string | null;
};

export type WizardOperationalSubmitResult = {
  requestId: string;
  caseId: string;
  caseCode: string;
  status: string;
  productType: ProductType;
  productLabel: string;
  documentsCount: number;
  partiesCount: number;
  triageModulesCount: number;
  timelineEventsCount: number;
  sourceMode: Case["sourceMode"];
};

const productAliases: Record<string, ProductType> = {
  analise_contratual: "analise_contratual",
  contract_analysis: "analise_contratual",
  consulta_objeto: "consulta_objeto",
  dados_partes: "dados_partes",
  reuniao_advogado: "reuniao_equipe",
  reuniao_equipe: "reuniao_equipe"
};

export function caseCodeFromId(id: string): string {
  if (id.toLowerCase().startsWith("case-")) {
    return id.replace(/^case-/i, "CASE-").toUpperCase();
  }

  return `CASO-${id.slice(0, 8).toUpperCase()}`;
}

export function productFromMetadata(metadata: Record<string, unknown>): ProductType {
  const product = metadata.product;

  return typeof product === "string"
    ? productAliases[product] ?? "analise_contratual"
    : "analise_contratual";
}

function progressFromStatus(status: string): number {
  const progress: Record<string, number> = {
    approved: 95,
    cancelled: 0,
    completed: 100,
    delivered: 100,
    draft: 5,
    failed: 100,
    processing: 45,
    review: 80,
    submitted: 15
  };

  return progress[status] ?? 35;
}

export function clampProgress(progress: number): number {
  return Math.max(0, Math.min(100, Math.round(progress)));
}

export function isPaginatedCaseList(
  payload: BackendCaseListPayload
): payload is BackendCaseListPage {
  return !Array.isArray(payload) && Array.isArray(payload.items);
}

function caseTypeFromProduct(product: ProductType, rawCaseType?: string): string {
  if (rawCaseType && rawCaseType !== product) {
    return rawCaseType;
  }

  return product === "analise_contratual" ? "contract_analysis" : product;
}

export function selectedWizardModules(modulos: Record<Modulo, boolean>): Modulo[] {
  return (Object.keys(MODULOS) as Modulo[]).filter((modulo) => modulos[modulo]);
}

function caseTypeForWizardProduct(product: Produto): string {
  const map: Record<Produto, string> = {
    analise_contratual: "contract_analysis",
    consulta_objeto: "object_query",
    dados_partes: "party_data",
    reuniao_equipe: "lawyer_meeting"
  };

  return map[product];
}

function primaryWizardPartyName(input: LocalCaseWizardInput): string {
  return (
    input.parties.find((party) => party.nome.trim())?.nome.trim() ??
    "Cliente nao informado"
  );
}

function wizardTitle(input: LocalCaseWizardInput): string {
  return `${PRODUTOS[input.produto].titulo} - ${primaryWizardPartyName(input)}`;
}

function wizardDescription(input: LocalCaseWizardInput): string {
  const activeModules = selectedWizardModules(input.modulos);
  const documentText = input.arquivo?.name
    ? `Documento informado: ${input.arquivo.name}.`
    : "Sem documento informado.";

  return [
    "Pedido criado pelo fluxo Novo Pedido / Wizard.",
    `Produto juridico: ${PRODUTOS[input.produto].titulo}.`,
    `Modulos selecionados: ${activeModules.length}.`,
    documentText
  ].join(" ");
}

export function mapWizardSubmitPayload(input: WizardOperationalSubmitInput) {
  const activeModules = selectedWizardModules(input.modulos);
  const productLabel = PRODUTOS[input.produto].titulo;

  return {
    product_type: input.produto,
    client_id: input.clientId ?? null,
    product_label: productLabel,
    title: wizardTitle(input),
    description: wizardDescription(input),
    source_mode: "local",
    idempotency_key: input.idempotencyKey,
    notes: "Criado pelo Wizard operacional backend local.",
    selected_modules: activeModules,
    parties: input.parties
      .filter((party) => party.nome.trim())
      .map((party) => ({
        name: party.nome.trim(),
        document: (party.documento ?? "").trim() || null,
        document_type: party.tipoPessoa === "pj" ? "cnpj" : "cpf",
        person_type: party.tipoPessoa === "pj" ? "company" : "individual",
        role: party.papel,
        email: (party.email ?? "").trim() || null,
        phone: (party.telefone ?? "").trim() || null,
        metadata: {
          source: "new_case_wizard",
          wizard_party_id: party.id
        }
      })),
    document:
      input.arquivo?.status === "done"
        ? {
            filename: input.arquivo.name,
            original_filename: input.arquivo.name,
            mime_type: input.arquivo.type || "application/octet-stream",
            size_bytes: input.arquivo.size,
            storage_provider: "local",
            status: "uploaded",
            preview_available: false,
            download_available: false
          }
        : null,
    metadata: {
      case_type: caseTypeForWizardProduct(input.produto),
      module_names: activeModules.map((modulo) => MODULOS[modulo].titulo),
      modules: activeModules,
      product: input.produto,
      source: "new_case_wizard",
      source_mode: "local"
    }
  };
}

export function mapWizardSubmitResponse(
  payload: BackendWizardSubmitResponse
): WizardOperationalSubmitResult {
  const requestId = payload.request_id ?? payload.id;
  const caseId = payload.case_id ?? "";
  return {
    requestId,
    caseId,
    caseCode: payload.case_code ?? caseCodeFromId(caseId || requestId),
    status: payload.case_status ?? payload.status,
    productType: productAliases[payload.product_type] ?? "analise_contratual",
    productLabel: payload.product_label,
    documentsCount: payload.documents_count ?? 0,
    partiesCount: payload.parties_count ?? 0,
    triageModulesCount: payload.triage_modules_count ?? 0,
    timelineEventsCount: payload.timeline_events_count ?? 0,
    sourceMode: payload.source_mode as Case["sourceMode"]
  };
}

export function buildCaseListQuery(filters: CaseListFilters = {}): string {
  const search = new URLSearchParams();

  if (filters.status) search.set("status", filters.status);
  if (filters.caseType) search.set("case_type", filters.caseType);
  if (filters.clientId) search.set("client_id", filters.clientId);
  if (filters.productType) search.set("product_type", filters.productType);
  if (filters.riskLevel) search.set("risk_level", filters.riskLevel);
  if (filters.q) search.set("q", filters.q);
  if (filters.page) search.set("page", String(filters.page));
  if (filters.pageSize) search.set("page_size", String(filters.pageSize));
  if (filters.sortBy) search.set("sort_by", filters.sortBy);
  if (filters.sortOrder) search.set("sort_order", filters.sortOrder);

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function mapBackendCase(
  legalCase: BackendCase,
  clients: Client[] = []
): Case {
  const client = clients.find((item) => item.id === legalCase.client_id);

  const product = legalCase.product_type
    ? productAliases[legalCase.product_type] ?? productFromMetadata(legalCase.metadata)
    : productFromMetadata(legalCase.metadata);

  return {
    id: legalCase.id,
    code: legalCase.code || caseCodeFromId(legalCase.id),
    clientId: legalCase.client_id,
    clientName: client?.name ?? `Cliente ${legalCase.client_id.slice(0, 8)}`,
    caseType: legalCase.case_type,
    product,
    productType: product,
    productLabel: legalCase.product_label ?? undefined,
    title: legalCase.title ?? undefined,
    status: legalCase.status as Case["status"],
    priority: legalCase.priority,
    documentsCount: 0,
    progressPercent: progressFromStatus(legalCase.status),
    assignedTo: null,
    notes:
      typeof legalCase.metadata.notes === "string"
        ? legalCase.metadata.notes
        : "",
    metadata: legalCase.metadata,
    parties: [],
    updatedAt: legalCase.updated_at,
    createdAt: legalCase.created_at,
    submittedAt: legalCase.submitted_at
  };
}

export function mapOperationalCase(legalCase: BackendOperationalCase): Case {
  const id = legalCase.case_id ?? legalCase.id ?? "";
  const product = productAliases[legalCase.product_type ?? ""] ?? "analise_contratual";
  const title = legalCase.title?.trim() || legalCase.code || "Caso operacional";
  const progress =
    typeof legalCase.progress === "number"
      ? clampProgress(legalCase.progress)
      : progressFromStatus(legalCase.status ?? "");

  return {
    id,
    code: legalCase.code ?? caseCodeFromId(id),
    clientId: legalCase.client_id ?? legalCase.request_id ?? id,
    clientName: legalCase.client_name?.trim() || "Não informado",
    caseType: caseTypeFromProduct(product, legalCase.case_type),
    product,
    productLabel: legalCase.product_label,
    status: (legalCase.status ?? "created") as Case["status"],
    priority: "normal",
    documentsCount: legalCase.documents_count ?? 0,
    progressPercent: progress,
    progress,
    riskLevel: legalCase.risk_level as Case["riskLevel"],
    recommendation: legalCase.recommendation as Case["recommendation"],
    sourceMode: legalCase.source_mode as Case["sourceMode"],
    assignedTo: null,
    notes: legalCase.description ?? "",
    metadata: {
      description: legalCase.description,
      partiesCount: legalCase.parties_count ?? 0,
      recommendation: legalCase.recommendation,
      reportStatus: legalCase.report_status,
      requestId: legalCase.request_id,
      riskLevel: legalCase.risk_level,
      sourceMode: legalCase.source_mode,
      title,
      triageStatus: legalCase.triage_status
    },
    parties: [],
    updatedAt: legalCase.updated_at ?? new Date().toISOString(),
    createdAt: legalCase.created_at ?? legalCase.updated_at ?? new Date().toISOString(),
    submittedAt: legalCase.created_at ?? null
  };
}

function mapAggregateCase(payload: BackendCaseAggregate): Case {
  const firstParty = payload.parties[0];
  return mapOperationalCase({
    id: payload.case.id,
    case_id: payload.case.id,
    request_id: payload.case.request_id,
    code: payload.case.code,
    title: payload.case.title,
    description: payload.case.description,
    case_type: payload.case.product_type,
    product_type: payload.case.product_type,
    product_label: payload.case.product_label,
    client_name: payload.case.client_name ?? firstParty?.name,
    status: payload.case.status,
    progress: payload.summary.progress,
    risk_level: payload.summary.risk_level,
    recommendation: payload.case.recommendation,
    parties_count: payload.summary.parties_count,
    documents_count: payload.summary.documents_count,
    triage_status: payload.summary.triage_status,
    report_status: payload.summary.report_status,
    source_mode: payload.summary.source_mode,
    created_at: payload.case.created_at,
    updated_at: payload.summary.updated_at
  });
}

function mapLegalRequest(request: BackendLegalRequest | null): LegalRequest | null {
  if (!request) return null;

  return {
    id: request.id,
    code: request.code,
    organizationId: request.organization_id,
    createdBy: request.created_by,
    productType: productAliases[request.product_type] ?? "analise_contratual",
    productLabel: request.product_label,
    title: request.title,
    description: request.description,
    status: request.status as LegalRequest["status"],
    sourceMode: request.source_mode as LegalRequest["sourceMode"],
    idempotencyKey: request.idempotency_key,
    createdAt: request.created_at,
    updatedAt: request.updated_at
  };
}

function mapAggregateParty(party: BackendAggregateParty): Party {
  return {
    id: party.id,
    caseId: party.case_id,
    organizationId: party.organization_id,
    name: party.name,
    document: party.document_masked ?? "",
    documentMasked: party.document_masked ?? undefined,
    documentType: party.document_type as Party["documentType"],
    personType: party.person_type as Party["personType"],
    type: party.role,
    role: party.role,
    email: party.email_masked ?? "",
    phone: party.phone_masked ?? "",
    notes: typeof party.metadata.notes === "string" ? party.metadata.notes : "",
    status: party.status as Party["status"],
    riskLevel: party.risk_level as Party["riskLevel"],
    providerStatusSummary: party.provider_status_summary,
    metadata: party.metadata,
    createdAt: party.created_at,
    updatedAt: party.updated_at
  };
}

function mapAggregateDocument(document: BackendAggregateDocument): Document {
  const uploadedAt = document.uploaded_at ?? document.updated_at;
  return {
    id: document.id,
    filename: document.filename,
    originalFilename: document.original_filename,
    caseId: document.case_id,
    organizationId: document.organization_id,
    caseCode: caseCodeFromId(document.case_id),
    contentType: document.mime_type,
    mimeType: document.mime_type,
    status: document.status as Document["status"],
    sizeBytes: document.size_bytes,
    sizeLabel: formatBytes(document.size_bytes),
    fileHash: null,
    storageProvider: document.storage_provider as Document["storageProvider"],
    storageKey: document.storage_key,
    ocrStatus: document.ocr_status as Document["ocrStatus"],
    aiReadStatus: document.ai_read_status as Document["aiReadStatus"],
    previewAvailable: document.preview_available,
    downloadAvailable: document.download_available,
    uploadedAt,
    updatedAt: document.updated_at,
    processedAt: document.status === "processed" ? document.updated_at : null,
    metadata: {},
    notes: ""
  };
}

function timelineStatusFromSeverity(severity: string): TimelineEvent["status"] {
  if (severity === "error") return "failed";
  if (severity === "success") return "completed";
  return "processing";
}

function mapAggregateTimelineEvent(event: BackendAggregateTimelineEvent): TimelineEvent {
  return {
    id: event.id,
    caseId: event.case_id,
    organizationId: event.organization_id,
    type: event.type,
    title: event.title,
    status: timelineStatusFromSeverity(event.severity),
    label: event.title,
    description: event.description,
    severity: event.severity as TimelineEvent["severity"],
    source: event.source as TimelineEvent["source"],
    sourceMode: event.source_mode as TimelineEvent["sourceMode"],
    actor: event.source,
    metadata: event.metadata,
    createdAt: event.created_at
  };
}

function mapAggregateTriageModule(module: BackendAggregateTriageModule): TriageModule {
  return {
    id: module.id,
    caseId: module.case_id,
    organizationId: module.organization_id,
    moduleKey: module.module_key,
    moduleLabel: module.module_label,
    provider: module.provider,
    // Backend grava o módulo executado como "done"; o front usa "completed"
    // (StatusBadge mapeia "completed" -> "Dados recebidos"). Normaliza aqui.
    status: (module.status === "done"
      ? "completed"
      : module.status) as TriageModule["status"],
    sourceMode: module.source_mode as TriageModule["sourceMode"],
    required: module.required,
    reason: module.reason,
    startedAt: module.started_at,
    finishedAt: module.finished_at,
    attempts: module.attempts,
    errorCode: module.error_code,
    errorMessage: module.error_message,
    summary: module.summary,
    resultRef: module.result_ref,
    rawResultRef: module.raw_result_ref,
    createdAt: module.created_at,
    updatedAt: module.updated_at
  };
}

function mapAggregateProviderResult(result: BackendAggregateProviderResult): ProviderResult {
  return {
    id: result.id,
    caseId: result.case_id,
    triageModuleId: result.triage_module_id,
    organizationId: result.organization_id,
    provider: result.provider,
    providerRequestId: result.provider_request_id,
    sourceMode: result.source_mode as ProviderResult["sourceMode"],
    status: result.status as ProviderResult["status"],
    inputHash: result.input_hash,
    rawResultRef: result.raw_result_ref,
    normalizedResult: result.normalized_result,
    summary: result.summary,
    riskSignals: result.risk_signals,
    confidence: result.confidence,
    errorCode: result.error_code,
    errorMessage: result.error_message,
    createdAt: result.created_at,
    updatedAt: result.updated_at
  };
}

function sourceRefLabel(sourceRef: Record<string, unknown> | string): string {
  if (typeof sourceRef === "string") return sourceRef;
  const type = typeof sourceRef.type === "string" ? sourceRef.type : "source";
  const id = typeof sourceRef.id === "string" ? sourceRef.id : undefined;
  const summary = typeof sourceRef.summary === "string" ? sourceRef.summary : undefined;
  return [type, id, summary].filter(Boolean).join(" · ");
}

function mapAggregateReport(report: BackendAggregateReport | null, legalCase: Case): Report | null {
  if (!report) return null;

  const riskSections = [
    ...report.legal_risks.map((description, index) => ({
      id: `${report.id}-legal-${index}`,
      title: "Risco jurídico",
      description
    })),
    ...report.commercial_risks.map((description, index) => ({
      id: `${report.id}-commercial-${index}`,
      title: "Risco comercial",
      description
    })),
    ...report.reputational_risks.map((description, index) => ({
      id: `${report.id}-reputational-${index}`,
      title: "Risco reputacional",
      description
    })),
    ...report.contractual_risks.map((description, index) => ({
      id: `${report.id}-contractual-${index}`,
      title: "Risco contratual",
      description
    }))
  ];

  return {
    id: report.id,
    caseId: report.case_id,
    organizationId: report.organization_id,
    caseCode: legalCase.code,
    status: report.status as Report["status"],
    title: `Relatório ${legalCase.code}`,
    summary: report.summary,
    findings: report.findings,
    legalRisks: report.legal_risks,
    commercialRisks: report.commercial_risks,
    reputationalRisks: report.reputational_risks,
    contractualRisks: report.contractual_risks,
    missingInformation: report.missing_information,
    recommendation: report.recommendation as Report["recommendation"],
    confidence: report.confidence,
    limitations: report.limitations,
    sourceRefs: report.source_refs.map(sourceRefLabel),
    risks: riskSections,
    recommendations: report.recommendation ? [report.recommendation] : [],
    generatedAt: report.generated_at ?? report.updated_at,
    approvedAt: null,
    approvedBy: null,
    version: report.version
  };
}

const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "pending",
  "simulated",
  "paid",
  "failed",
  "canceled",
  "expired",
  "refunded"
];

export function mapPaymentStatus(value: string | null | undefined): PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value ?? "")
    ? (value as PaymentStatus)
    : "pending";
}

/**
 * Converte o snapshot de installment_plan do backend para o domínio do front.
 * Campos sensíveis (payload_hash, idempotency_key, payment_form, raw) ficam
 * de fora por decisão explícita — nunca chegam à UI (spec §11).
 */
export function mapInstallmentPlan(
  plan: BackendInstallmentPlan | null | undefined
): InstallmentPlan | null {
  if (!plan) return null;

  const payment = plan.payment ?? null;
  return {
    version: plan.version ?? 1,
    pricingConfigVersion: plan.pricing_config_version ?? 0,
    selectedAt: plan.selected_at ?? null,
    sourceTotalCents: plan.source_total_cents ?? 0,
    method: (plan.method ?? "pix") as PaymentMethod,
    parcelas: plan.parcelas ?? 1,
    hasJuros: plan.has_juros ?? false,
    jurosMensalBps: plan.juros_mensal_bps ?? 0,
    valorTotalCents: plan.valor_total_cents ?? 0,
    acrescimoCents: plan.acrescimo_cents ?? 0,
    currency: plan.currency ?? "BRL",
    schedule: (plan.schedule ?? []).map((item) => ({
      numero: item.numero,
      vencimento: item.vencimento,
      valorCents: item.valor_cents
    })),
    payment: payment
      ? {
          provider: payment.provider ?? "mock",
          mode: payment.mode ?? "mock",
          status: payment.status ?? "simulated",
          method: payment.method ?? "",
          externalReference: payment.external_reference ?? null,
          requestedAt: payment.requested_at ?? null,
          brand: payment.payment_form?.brand ?? null,
          last4: payment.payment_form?.last4 ?? null,
          authorizationCode: payment.payment_form?.authorization_code ?? null,
          simulated: payment.payment_form?.simulated ?? payment.mode === "mock"
        }
      : null
  };
}

function mapAggregateSummary(summary: BackendAggregateSummary): CaseOperationSummary {
  return {
    caseId: summary.case_id,
    organizationId: summary.organization_id,
    partiesCount: summary.parties_count,
    documentsCount: summary.documents_count,
    triageStatus: summary.triage_status as CaseOperationSummary["triageStatus"],
    reportStatus: summary.report_status as CaseOperationSummary["reportStatus"],
    riskLevel: summary.risk_level as CaseOperationSummary["riskLevel"],
    progress: clampProgress(summary.progress),
    latestEventAt: summary.latest_event_at,
    sourceMode: summary.source_mode as CaseOperationSummary["sourceMode"],
    updatedAt: summary.updated_at
  };
}

export function mapBackendCaseAggregate(payload: BackendCaseAggregate): CaseAggregate {
  const legalCase = mapAggregateCase(payload);
  const parties = payload.parties.map(mapAggregateParty);
  return {
    case: {
      ...legalCase,
      parties,
      documentsCount: payload.summary.documents_count,
      progressPercent: clampProgress(payload.summary.progress)
    },
    request: mapLegalRequest(payload.request),
    parties,
    documents: payload.documents.map(mapAggregateDocument),
    timeline: payload.timeline.map(mapAggregateTimelineEvent),
    triageModules: payload.triage_modules.map(mapAggregateTriageModule),
    providerResults: payload.provider_results.map(mapAggregateProviderResult),
    report: mapAggregateReport(payload.report, legalCase),
    summary: mapAggregateSummary(payload.summary),
    paymentStatus: mapPaymentStatus(payload.payment_status),
    installmentPlan: mapInstallmentPlan(payload.installment_plan),
    installmentOptions: payload.installment_options ?? [],
    pricingConfigVersion: payload.pricing_config_version ?? 0,
    totalPriceCents: payload.total_price_cents ?? 0,
    paymentMode: payload.payment_mode ?? "mock"
  };
}

export function mapCaseListPayload(
  payload: BackendCaseListPayload,
  clients: Client[] = []
): Case[] {
  if (isPaginatedCaseList(payload)) {
    return payload.items.map((legalCase) => mapOperationalCase(legalCase));
  }

  return payload.map((legalCase) => mapBackendCase(legalCase, clients));
}
