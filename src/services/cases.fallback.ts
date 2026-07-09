/**
 * Fallback local do domínio de casos — constrói agregados/casos sintéticos a
 * partir do que foi salvo pelo Wizard local quando a API está indisponível.
 * Só é usado quando o mock fallback está habilitado (ver services/fallback.ts);
 * nunca mascara erro em produção.
 */
import { MODULOS, type Modulo } from "@/lib/produtoConfig";
import { formatBytes } from "@/lib/formatters";
import type {
  Case,
  CaseAggregate,
  CaseCreate,
  CaseOperationSummary,
  Client,
  Document,
  Party,
  TimelineEvent,
  TriageModule
} from "@/types";
import { clampProgress, productFromMetadata } from "./cases.mappers";

function fallbackDocumentsFromCase(legalCase: Case): Document[] {
  const wizardDocument = legalCase.metadata?.wizardDocument;
  if (!wizardDocument || typeof wizardDocument !== "object") return [];

  const documentMetadata = wizardDocument as Record<string, unknown>;
  const filename =
    typeof documentMetadata.filename === "string"
      ? documentMetadata.filename
      : "documento-local";
  const mimeType =
    typeof documentMetadata.mimeType === "string"
      ? documentMetadata.mimeType
      : "application/octet-stream";
  const sizeBytes =
    typeof documentMetadata.sizeBytes === "number"
      ? documentMetadata.sizeBytes
      : 0;
  const uploadedAt = legalCase.submittedAt ?? legalCase.createdAt;

  return [
    {
      id: `${legalCase.id}-document-local-1`,
      filename,
      originalFilename: filename,
      caseId: legalCase.id,
      organizationId: legalCase.organizationId ?? "local",
      caseCode: legalCase.code,
      contentType: mimeType,
      mimeType,
      status: "uploaded",
      sizeBytes,
      sizeLabel: formatBytes(sizeBytes),
      fileHash: null,
      storageProvider: "local",
      storageKey: `local/wizard/${legalCase.id}/${filename}`,
      ocrStatus: "not_started",
      aiReadStatus: "not_started",
      previewAvailable: false,
      downloadAvailable: false,
      uploadedAt,
      updatedAt: legalCase.updatedAt,
      processedAt: null,
      metadata: {
        source: "new_case_wizard",
        sourceMode: "local"
      },
      notes: "Metadata local do documento selecionado no Wizard."
    }
  ];
}

function metadataArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function fallbackTriageModulesFromCase(legalCase: Case): TriageModule[] {
  const moduleKeys = metadataArray(legalCase.metadata?.modules);
  const moduleNames = metadataArray(legalCase.metadata?.moduleNames);
  const now = legalCase.updatedAt;

  return moduleKeys.map((moduleKey, index) => ({
    id: `${legalCase.id}-triage-${moduleKey}`,
    caseId: legalCase.id,
    organizationId: legalCase.organizationId ?? "local",
    moduleKey,
    moduleLabel: moduleNames[index] ?? MODULOS[moduleKey as Modulo]?.titulo ?? moduleKey,
    provider: "mock_local",
    status: "not_started",
    sourceMode: "local",
    required: true,
    reason: "Módulo selecionado no Wizard local de fallback.",
    startedAt: null,
    finishedAt: null,
    attempts: 0,
    errorCode: null,
    errorMessage: null,
    summary: null,
    resultRef: null,
    rawResultRef: null,
    createdAt: legalCase.createdAt,
    updatedAt: now
  }));
}

function fallbackTimelineFromCase(
  legalCase: Case,
  documents: Document[],
  triageModules: TriageModule[]
): TimelineEvent[] {
  const organizationId = legalCase.organizationId ?? "local";
  const base = {
    caseId: legalCase.id,
    organizationId,
    source: "mock" as const,
    sourceMode: "local" as const,
    status: "completed" as const,
    createdAt: legalCase.createdAt
  };
  const events: TimelineEvent[] = [
    {
      ...base,
      id: `${legalCase.id}-timeline-request-created`,
      type: "request_created",
      title: "Pedido local criado",
      label: "Pedido local criado",
      description: "Fallback local registrou o pedido porque a API estava indisponível.",
      severity: "info",
      actor: "fallback-local",
      metadata: { source: "new_case_wizard", sourceMode: "local" }
    },
    {
      ...base,
      id: `${legalCase.id}-timeline-case-created`,
      type: "case_created",
      title: "Caso local criado",
      label: "Caso local criado",
      description: "Caso local de fallback criado com o mesmo case_id usado na navegação.",
      severity: "info",
      actor: "fallback-local",
      metadata: { source: "new_case_wizard", sourceMode: "local" }
    }
  ];

  legalCase.parties.forEach((party) => {
    events.push({
      ...base,
      id: `${legalCase.id}-timeline-party-${party.id}`,
      type: "party_added",
      title: "Parte adicionada",
      label: "Parte adicionada",
      description: "Parte informada no Wizard local vinculada ao caso de fallback.",
      severity: "info",
      actor: "fallback-local",
      metadata: { partyId: party.id, role: party.type, source: "new_case_wizard" }
    });
  });

  documents.forEach((document) => {
    events.push({
      ...base,
      id: `${legalCase.id}-timeline-document-${document.id}`,
      type: "document_attached",
      title: "Documento anexado",
      label: "Documento anexado",
      description: "Metadata do documento selecionado no Wizard local vinculada ao caso de fallback.",
      severity: "info",
      actor: "fallback-local",
      metadata: { documentId: document.id, filename: document.filename }
    });
  });

  if (triageModules.length > 0) {
    events.push({
      ...base,
      id: `${legalCase.id}-timeline-triage-plan-created`,
      type: "triage_plan_created",
      title: "Plano de triagem local criado",
      label: "Plano de triagem local criado",
      description: "Módulos selecionados no Wizard foram preservados no fallback local.",
      severity: "info",
      actor: "fallback-local",
      metadata: { moduleKeys: triageModules.map((module) => module.moduleKey) }
    });
  }

  events.push({
    ...base,
    id: `${legalCase.id}-timeline-wizard-completed`,
    type: "wizard_completed",
    title: "Wizard concluído",
    label: "Wizard concluído",
    description: "Novo Pedido concluído no fallback local explícito.",
    severity: "success",
    actor: "fallback-local",
    metadata: { source: "new_case_wizard", sourceMode: "local" }
  });

  return events;
}

function fallbackProgressFromAggregate(
  legalCase: Case,
  documents: Document[],
  triageModules: TriageModule[],
  timeline: TimelineEvent[]
): number {
  // Formula de fallback local: case/request (10) + partes (10) + documentos (10) + timeline (5) + plano de triagem (5).
  const progress =
    10 +
    (legalCase.parties.length > 0 ? 10 : 0) +
    (documents.length > 0 ? 10 : 0) +
    (timeline.length > 0 ? 5 : 0) +
    (triageModules.length > 0 ? 5 : 0);
  return clampProgress(Math.max(legalCase.progressPercent, Math.min(40, progress)));
}

export function makeFallbackAggregate(legalCase: Case): CaseAggregate {
  const sourceMode = (legalCase.sourceMode ?? "mock") as CaseOperationSummary["sourceMode"];
  const fallbackDocuments = fallbackDocumentsFromCase(legalCase);
  const fallbackTriageModules = fallbackTriageModulesFromCase(legalCase);
  const fallbackTimeline = fallbackTimelineFromCase(
    legalCase,
    fallbackDocuments,
    fallbackTriageModules
  );
  const progress = fallbackProgressFromAggregate(
    legalCase,
    fallbackDocuments,
    fallbackTriageModules,
    fallbackTimeline
  );
  return {
    case: {
      ...legalCase,
      progress,
      progressPercent: progress
    },
    request: null,
    parties: legalCase.parties as Party[],
    documents: fallbackDocuments,
    timeline: fallbackTimeline,
    triageModules: fallbackTriageModules,
    providerResults: [],
    report: null,
    summary: {
      caseId: legalCase.id,
      organizationId: legalCase.organizationId,
      partiesCount: legalCase.parties.length,
      documentsCount: fallbackDocuments.length || legalCase.documentsCount,
      triageStatus: fallbackTriageModules.length > 0 ? "not_started" : "not_started",
      reportStatus: "not_started",
      riskLevel: legalCase.riskLevel ?? "unknown",
      progress,
      latestEventAt:
        fallbackTimeline.length > 0
          ? fallbackTimeline[fallbackTimeline.length - 1].createdAt
          : null,
      sourceMode,
      updatedAt: legalCase.updatedAt
    },
    paymentStatus: "pending",
    installmentPlan: null,
    installmentOptions: [],
    pricingConfigVersion: 0,
    totalPriceCents: 0,
    paymentMode: "mock"
  };
}

export function makeMockCase(payload: CaseCreate, clients: Client[] = []): Case {
  const now = new Date().toISOString();
  const client = clients.find((item) => item.id === payload.client_id);

  return {
    id: `case-local-${Date.now()}`,
    code: `CASO-LOCAL-${Date.now().toString().slice(-4)}`,
    clientId: payload.client_id,
    clientName: client?.name ?? "Cliente",
    caseType: payload.case_type,
    product: productFromMetadata(payload.metadata ?? {}),
    status: "draft",
    priority: payload.priority ?? "normal",
    documentsCount: 0,
    progressPercent: 5,
    assignedTo: null,
    notes:
      typeof payload.metadata?.notes === "string"
        ? payload.metadata.notes
        : "",
    metadata: payload.metadata ?? { source: "frontend_mock_fallback" },
    parties: [],
    updatedAt: now,
    createdAt: now,
    submittedAt: null
  };
}
