/**
 * Final report uploads — uses the existing documents upload endpoint with
 * ``metadata.kind = "final_report"`` so we don't need a new backend route.
 */

import { apiClient } from "@/src/services/apiClient";
import { formatBytes } from "@/lib/formatters";

export { formatBytes };

export const FINAL_REPORT_KIND = "final_report";

export const FINAL_REPORT_ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc (legacy)
  "text/plain",
];

export const FINAL_REPORT_ACCEPT_ATTR = ".pdf,.docx,.doc,.txt";

export interface FinalReportDocument {
  id: string;
  caseId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string | null;
  uploadedBy: string | null;
  kind: string;
}

interface BackendDocument {
  id: string;
  case_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string | null;
  uploaded_by: string | null;
  metadata?: Record<string, unknown>;
}

function mapDocument(doc: BackendDocument): FinalReportDocument {
  const kind = typeof doc.metadata?.kind === "string" ? doc.metadata.kind : "";
  return {
    id: doc.id,
    caseId: doc.case_id,
    filename: doc.filename,
    contentType: doc.content_type,
    sizeBytes: doc.size_bytes,
    uploadedAt: doc.uploaded_at,
    uploadedBy: doc.uploaded_by,
    kind,
  };
}

/**
 * Upload a final report file linked to the given case.
 * Wraps POST /api/v1/documents/upload with metadata.kind = "final_report".
 */
export async function uploadFinalReport(
  caseId: string,
  file: File
): Promise<FinalReportDocument> {
  // Backend serverless: registra o documento (JSON) e recebe uma URL pré-assinada;
  // o binário vai direto ao storage via PUT (requer S3 configurado — fase AWS).
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "pdf";
  const reg = await apiClient.post<{ document_id: string; upload_url: string }>(
    "/api/v1/documents",
    {
      case_id: caseId,
      file_name: file.name,
      file_type: ext,
      file_size_bytes: file.size,
    }
  );
  await fetch(reg.data.upload_url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  const res = await apiClient.get<BackendDocument>(
    `/api/v1/documents/${reg.data.document_id}`
  );
  return mapDocument(res.data);
}

/**
 * List final reports for the case (documentos do caso via /documents?case_id).
 */
export async function listFinalReports(
  caseId: string
): Promise<FinalReportDocument[]> {
  const res = await apiClient.get<BackendDocument[]>(
    `/api/v1/documents?case_id=${caseId}`
  );
  return res.data.map(mapDocument);
}

interface BackendDownloadUrl {
  url: string;
  expires_at: string;
}

/**
 * Get a (presigned or direct) download URL for the document.
 */
export async function getFinalReportDownloadUrl(
  documentId: string
): Promise<string> {
  const res = await apiClient.get<BackendDownloadUrl>(
    `/api/v1/documents/${documentId}/download-url`
  );
  return res.data.url;
}
