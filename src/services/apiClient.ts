import {
  ensureCsrfToken,
  markSessionUnauthenticated
} from "@/lib/sessionClient";
import type {
  ApiError,
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse
} from "@/types/api";
import { SOURCE_MODE_VALUES, type SourceMode } from "@/types";

const DEFAULT_API_TIMEOUT_MS = 30_000;
const SAFE_METHODS = new Set(["GET", "HEAD"]);

type ApiClientOptions = RequestInit & {
  timeoutMs?: number;
};

function createTimeoutSignal(timeoutMs: number): {
  clear: () => void;
  signal: AbortSignal;
} {
  const controller = new AbortController();
  const id = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  return {
    clear: () => globalThis.clearTimeout(id),
    signal: controller.signal
  };
}

function mergeSignals(
  userSignal: AbortSignal | null | undefined,
  timeoutSignal: AbortSignal
): AbortSignal {
  if (!userSignal) return timeoutSignal;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([userSignal, timeoutSignal]);
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  userSignal.addEventListener("abort", abort, { once: true });
  timeoutSignal.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

function normalizeApiError(error: ApiError | undefined, status: number): ApiError {
  if (error && typeof error.code === "string" && typeof error.message === "string") {
    return error;
  }
  return {
    code: "HTTP_ERROR",
    details: {},
    message: `Erro HTTP ${status}.`
  };
}

function isAppErrorEnvelope(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return (
    record.success === false ||
    typeof record.error === "string" ||
    (typeof record.error === "object" && record.error !== null)
  );
}

function extractApiError(
  payload: unknown,
  hasSuccessField: boolean
): ApiError | undefined {
  const record = (payload ?? {}) as Record<string, unknown>;
  if (hasSuccessField) {
    const structured = (payload as ApiErrorResponse).error;
    if (structured && typeof structured === "object") return structured;
  }
  if (typeof record.error === "string" && record.error.trim()) {
    return { code: "HTTP_ERROR", details: {}, message: record.error };
  }
  return undefined;
}

function isAuthenticationFailure(status: number, payload: unknown): boolean {
  return status === 401 || (status === 403 && !isAppErrorEnvelope(payload));
}

function isSourceMode(value: unknown): value is SourceMode {
  return (
    typeof value === "string" &&
    (SOURCE_MODE_VALUES as readonly string[]).includes(value)
  );
}

function normalizeApiSuccess<T>(
  payload: ApiResponse<T> | { data: T } | unknown
): ApiSuccessResponse<T> {
  const raw = payload as Partial<ApiSuccessResponse<T>> & { data?: T };
  return {
    success: true,
    data: raw.data as T,
    error: null,
    request_id:
      typeof raw.request_id === "string" ? raw.request_id : "frontend-bff",
    source_mode: isSourceMode(raw.source_mode) ? raw.source_mode : "real",
    timestamp:
      typeof raw.timestamp === "string"
        ? raw.timestamp
        : new Date().toISOString(),
    ...(typeof raw.message === "string" ? { message: raw.message } : {})
  };
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly status: number;

  constructor(error: ApiError | undefined, status: number) {
    const normalized = normalizeApiError(error, status);
    super(normalized.message);
    this.name = "ApiClientError";
    this.code = normalized.code;
    this.details = normalized.details;
    this.status = status;
  }
}

export class ApiNetworkError extends Error {
  constructor(message = "API indisponível.") {
    super(message);
    this.name = "ApiNetworkError";
  }
}

function buildBffUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!normalized.startsWith("/api/v1/")) {
    throw new ApiClientError(
      {
        code: "INVALID_API_PATH",
        details: {},
        message: "O cliente só permite rotas versionadas da API."
      },
      400
    );
  }
  return `/api/backend${normalized}`;
}

function shouldSetJsonContentType(body: BodyInit | null | undefined): boolean {
  return Boolean(body) && !(body instanceof FormData);
}

export async function apiRequest<T>(
  path: string,
  options: ApiClientOptions = {}
): Promise<ApiSuccessResponse<T>> {
  const {
    timeoutMs,
    signal: userSignal,
    headers,
    ...requestOptions
  } = options;
  const method = (requestOptions.method ?? "GET").toUpperCase();
  const requestHeaders = new Headers(headers);

  if (
    !requestHeaders.has("Content-Type") &&
    shouldSetJsonContentType(requestOptions.body)
  ) {
    requestHeaders.set("Content-Type", "application/json");
  }
  // No browser, toda mutação recebe double-submit CSRF. Em SSR não existe
  // `document.cookie`; o BFF continua fail-closed e rejeita a chamada sem header.
  if (!SAFE_METHODS.has(method) && typeof document !== "undefined") {
    requestHeaders.set("X-CSRF-Token", await ensureCsrfToken());
  }

  const effectiveTimeout =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_API_TIMEOUT_MS;
  const url = buildBffUrl(path);
  const timeout = createTimeoutSignal(effectiveTimeout);
  const signal = mergeSignals(userSignal, timeout.signal);

  let response: Response;
  try {
    response = await fetch(url, {
      ...requestOptions,
      cache: requestOptions.cache ?? "no-store",
      credentials: "same-origin",
      headers: requestHeaders,
      method,
      signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiNetworkError("A API não respondeu dentro do tempo limite.");
    }
    throw new ApiNetworkError();
  } finally {
    timeout.clear();
  }

  let payload: ApiResponse<T> | { data: T };
  try {
    payload = (await response.json()) as ApiResponse<T> | { data: T };
  } catch {
    throw new ApiClientError(
      {
        code: "INVALID_RESPONSE",
        details: {},
        message: "Resposta inválida da API."
      },
      response.status
    );
  }

  const hasSuccessField = typeof (payload as ApiResponse<T>).success === "boolean";
  if (!response.ok || (hasSuccessField && !(payload as ApiResponse<T>).success)) {
    if (isAuthenticationFailure(response.status, payload)) {
      markSessionUnauthenticated();
    }
    throw new ApiClientError(
      extractApiError(payload, hasSuccessField),
      response.status
    );
  }

  return normalizeApiSuccess(payload);
}

export const apiClient = {
  delete: <T>(path: string, options?: ApiClientOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
  get: <T>(path: string, options?: ApiClientOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  patch: <T>(path: string, body: unknown, options?: ApiClientOptions) =>
    apiRequest<T>(path, {
      ...options,
      body: JSON.stringify(body),
      method: "PATCH"
    }),
  post: <T>(path: string, body: unknown, options?: ApiClientOptions) =>
    apiRequest<T>(path, {
      ...options,
      body: JSON.stringify(body),
      method: "POST"
    }),
  postForm: <T>(path: string, body: FormData, options?: ApiClientOptions) =>
    apiRequest<T>(path, { ...options, body, method: "POST" }),
  put: <T>(path: string, body: unknown, options?: ApiClientOptions) =>
    apiRequest<T>(path, {
      ...options,
      body: JSON.stringify(body),
      method: "PUT"
    })
};
