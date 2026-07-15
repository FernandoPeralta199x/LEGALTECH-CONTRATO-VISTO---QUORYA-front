import { apiClient } from "./apiClient";

export type FiscalNoteStatus =
  | "not_required"
  | "note_pending"
  | "authorized"
  | "rejected"
  | "note_canceled";

export type FiscalNoteItem = {
  id: string;
  doc_type: string;
  numero: string | null;
  serie: string | null;
  codigo_verificacao: string | null;
  status: FiscalNoteStatus;
  issued_at: string | null;
  authorized_at: string | null;
  amount_cents: number;
  tax_amount_cents: number;
  issuance_cost_cents: number;
  provider: string | null;
  document_url: string | null;
  xml_ref: string | null;
  rejection_reason: string | null;
  reference_at: string | null;
  request_id: string | null;
  case_id: string | null;
  client_id: string | null;
  external_id: string | null;
  notes: string | null;
  created_at: string | null;
};

export type NotesSummary = {
  invoices_count: number;
  invoices_authorized_count: number;
  invoices_pending_count: number;
  invoices_rejected_count: number;
  invoices_canceled_count: number;
  invoices_issuance_cost_cents: number;
  invoices_authorized_amount_cents: number;
  invoices_total_count: number;
  by_status: { status: string; count: number }[];
};

export type NotesResponse = {
  period: string;
  range: { from: string; to: string };
  currency: string;
  disclaimer: string;
  summary: NotesSummary;
  items: FiscalNoteItem[];
  total: number;
};

export type CreateNotePayload = {
  doc_type: string;
  numero?: string | null;
  serie?: string | null;
  status: FiscalNoteStatus;
  issued_at?: string | null;
  amount_cents: number;
  tax_amount_cents?: number;
  issuance_cost_cents?: number;
  document_url?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
};

/** GET /financial/fiscal-documents — SEM fallback mock (dado fiscal é real ou erro). */
export async function listNotes(period: string): Promise<NotesResponse> {
  const res = await apiClient.get<NotesResponse>(
    `/api/v1/financial/fiscal-documents?period=${encodeURIComponent(period)}`
  );
  return res.data as NotesResponse;
}

/** POST /financial/fiscal-documents — registra uma nota já emitida (não emite). */
export async function createNote(payload: CreateNotePayload): Promise<FiscalNoteItem> {
  const res = await apiClient.post<FiscalNoteItem>(
    "/api/v1/financial/fiscal-documents",
    payload
  );
  return res.data as FiscalNoteItem;
}
