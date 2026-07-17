import type { SourceMode } from "./domain";

export type ApiError = {
  code: string;
  message: string;
  details: Record<string, unknown>;
};

/**
 * Campos comuns do envelope APÓS a normalização no cliente
 * (`apiClient.normalizeApiSuccess`). ATENÇÃO (C3-04): o backend serverless emite
 * apenas `{ message, timestamp, data }` (`helpers.py::success_response`) —
 * `request_id` e `source_mode` NÃO vêm do backend; são sintetizados no cliente
 * (defaults `"frontend-local"` / `"real"`) quando ausentes. São sempre presentes
 * na resposta normalizada, mas não os trate como autoritativos do servidor.
 */
type ApiEnvelopeBase = {
  request_id: string;
  source_mode: SourceMode;
  timestamp: string;
};

export type ApiSuccessResponse<T> = ApiEnvelopeBase & {
  success: true;
  data: T;
  error: null;
  message?: string;
};

export type ApiErrorResponse = ApiEnvelopeBase & {
  success: false;
  data: null;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};
