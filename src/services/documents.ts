import { formatBytes } from "@/lib/formatters";
import type { Document } from "@/types";
import { apiClient } from "./apiClient";
import { shouldUseMockFallback, fallbackReason, type ServiceResult } from "./fallback";

type BackendDocument = {
  id: string;
  case_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  file_hash: string | null;
  status: string;
  uploaded_by: string | null;
  uploaded_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DocumentDownloadUrl = {
  expires_in_seconds: number;
  method: string;
  url: string;
};

export type EnqueueProcessingResult = {
  document_id: string;
  job_id: string;
  queue_backend: string;
  status: string;
};

export type DocumentUploadPayload = {
  caseId: string;
  file: File;
  metadata?: Record<string, unknown>;
};

export type UploadPhase = "registrando" | "enviando" | "finalizando" | "concluido";

export type UploadProgress = {
  percent: number;
  phase: UploadPhase;
};

const AUTHORITATIVE_METADATA_FIELDS = new Set([
  "organization_id",
  "tenant_id",
  "storage_bucket",
  "storage_key",
  "uploaded_by"
]);

function caseCodeFromId(caseId: string): string {
  if (caseId.toLowerCase().startsWith("case-")) {
    return caseId.replace(/^case-/i, "CASE-").toUpperCase();
  }

  return `CASO-${caseId.slice(0, 8).toUpperCase()}`;
}

export function mapBackendDocument(document: BackendDocument): Document {
  return {
    id: document.id,
    filename: document.filename,
    caseId: document.case_id,
    caseCode: caseCodeFromId(document.case_id),
    contentType: document.content_type,
    status: document.status as Document["status"],
    sizeBytes: document.size_bytes,
    sizeLabel: formatBytes(document.size_bytes),
    fileHash: document.file_hash,
    uploadedAt: document.uploaded_at ?? document.created_at,
    processedAt: document.status === "processed" ? document.updated_at : null,
    metadata: document.metadata,
    notes:
      typeof document.metadata.notes === "string"
        ? document.metadata.notes
        : ""
  };
}

function safeUploadMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(
      ([key, value]) =>
        !AUTHORITATIVE_METADATA_FIELDS.has(key) && value !== undefined
    )
  );
}

export async function listDocuments(
  params: { caseId?: string; status?: string } = {}
): Promise<ServiceResult<Document[]>> {
  try {
    const search = new URLSearchParams();
    if (params.caseId) {
      search.set("case_id", params.caseId);
    }
    if (params.status) {
      search.set("status", params.status);
    }

    const query = search.toString();
    const response = await apiClient.get<BackendDocument[]>(
      `/api/v1/documents${query ? `?${query}` : ""}`
    );

    return {
      data: response.data.map(mapBackendDocument),
      source: "api"
    };
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    return {
      data: [],
      fallbackReason: fallbackReason(error),
      source: "mock"
    };
  }
}

export async function uploadDocument(
  payload: DocumentUploadPayload,
  onProgress?: (progress: UploadProgress) => void
): Promise<ServiceResult<Document>> {
  // Backend serverless: registra o documento (JSON) e devolve uma URL pré-assinada;
  // o binário sobe direto ao storage via PUT (requer S3 configurado — fase AWS).
  // O progresso é reportado por etapas do fluxo presign (o PUT via fetch não expõe
  // progresso por bytes; a barra por bytes real fica para a fase AWS/S3 com XHR).
  const file = payload.file;
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "pdf";
  onProgress?.({ percent: 15, phase: "registrando" });
  const reg = await apiClient.post<{ document_id: string; upload_url: string }>(
    "/api/v1/documents",
    {
      case_id: payload.caseId,
      file_name: file.name,
      file_type: ext,
      file_size_bytes: file.size
    }
  );
  onProgress?.({ percent: 55, phase: "enviando" });
  const putRes = await fetch(reg.data.upload_url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" }
  });
  // fetch só rejeita em erro de rede; um 4xx/5xx do storage resolve com ok=false.
  // Sem esta checagem a falha de upload seria engolida e o fluxo mostraria "sucesso".
  if (!putRes.ok) {
    throw new Error(`Falha ao enviar o arquivo ao storage (HTTP ${putRes.status}).`);
  }
  onProgress?.({ percent: 85, phase: "finalizando" });
  const response = await apiClient.get<BackendDocument>(
    `/api/v1/documents/${reg.data.document_id}`
  );
  onProgress?.({ percent: 100, phase: "concluido" });
  return {
    data: mapBackendDocument(response.data),
    source: "api"
  };
}


export async function getDocumentDownloadUrl(
  documentId: string
): Promise<ServiceResult<DocumentDownloadUrl>> {
  try {
    const response = await apiClient.get<DocumentDownloadUrl>(
      `/api/v1/documents/${documentId}/download-url`
    );
    return {
      data: response.data,
      source: "api"
    };
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    throw new Error("Download indisponível no modo fallback.");
  }
}

export async function enqueueDocumentProcessing(
  documentId: string
): Promise<ServiceResult<EnqueueProcessingResult>> {
  try {
    const response = await apiClient.post<EnqueueProcessingResult>(
      `/api/v1/documents/${documentId}/enqueue-processing`,
      {}
    );
    return {
      data: response.data,
      source: "api"
    };
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    throw new Error("Processamento não pode ser enfileirado no modo fallback.");
  }
}
