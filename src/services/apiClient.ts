import { clearStoredSession, getStoredToken } from "@/lib/authStorage";
import type { ApiError, ApiErrorResponse, ApiResponse, ApiSuccessResponse } from "@/types/api";
import { SOURCE_MODE_VALUES, type SourceMode } from "@/types";

const DEFAULT_API_PORT = "8000";
const LOCAL_API_FALLBACK_HOST = "127.0.0.1";

const DEFAULT_API_TIMEOUT_MS = 30_000;

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function isLoopbackHost(hostname: string | undefined): boolean {
  if (!hostname) {
    return false;
  }

  return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname);
}

function getRuntimeLocation():
  | { hostname?: string; protocol?: string }
  | null {
  if (typeof window !== "undefined" && window.location) {
    return window.location;
  }

  if ("location" in globalThis) {
    return globalThis.location as { hostname?: string; protocol?: string };
  }

  return null;
}

function rewriteLoopbackForLanAccess(
  configuredBaseUrl: string,
  runtimeLocation: { hostname?: string } | null
): string {
  const browserHost = runtimeLocation?.hostname?.trim();
  if (!browserHost || browserHost === "0.0.0.0" || isLoopbackHost(browserHost)) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  try {
    const parsedUrl = new URL(configuredBaseUrl);
    if (!isLoopbackHost(parsedUrl.hostname)) {
      return normalizeBaseUrl(configuredBaseUrl);
    }

    parsedUrl.hostname = browserHost;
    return normalizeBaseUrl(parsedUrl.toString());
  } catch {
    return normalizeBaseUrl(configuredBaseUrl);
  }
}

function isLocalhost(hostname: string | undefined): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

export function resolveApiBaseUrl(): string {
  const runtimeLocation = getRuntimeLocation();
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  // In the browser, prefer relative paths for local development so requests go
  // through the Next.js rewrites (/api/v1/* -> backend). This avoids CORS and
  // ensures the dev/prod proxy config is respected. Only use an absolute URL
  // when explicitly pointed at a remote API.
  if (typeof window !== "undefined" && window.location) {
    if (configuredBaseUrl && !isLocalhost(new URL(configuredBaseUrl).hostname)) {
      return rewriteLoopbackForLanAccess(configuredBaseUrl, runtimeLocation);
    }
    return "";
  }

  if (configuredBaseUrl) {
    return rewriteLoopbackForLanAccess(configuredBaseUrl, runtimeLocation);
  }

  const hostname = runtimeLocation?.hostname?.trim();
  if (hostname && hostname !== "0.0.0.0") {
    const protocol = runtimeLocation?.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
  }

  return `http://${LOCAL_API_FALLBACK_HOST}:${DEFAULT_API_PORT}`;
}

type ApiClientOptions = RequestInit & {
  token?: string;
  timeoutMs?: number;
};

// C3-05: retorna `clear` (limpa o timer) além do signal. Antes, o timer era limpo
// disparando "abort" no signal no finally — mas esse abort se propagava pelo mergeSignals
// e cancelava o BODY da resposta quando o caller passava seu próprio `signal`. Agora
// limpamos o timer sem sinalizar abort algum.
function createTimeoutSignal(timeoutMs: number): { signal: AbortSignal; clear: () => void } {
  if (typeof AbortController === "undefined") {
    return { signal: undefined as unknown as AbortSignal, clear: () => {} };
  }
  const controller = new AbortController();
  const setTimeoutFn =
    typeof window !== "undefined" ? window.setTimeout.bind(window) : globalThis.setTimeout.bind(globalThis);
  const clearTimeoutFn =
    typeof window !== "undefined" ? window.clearTimeout.bind(window) : globalThis.clearTimeout.bind(globalThis);
  const id = setTimeoutFn(() => controller.abort(), timeoutMs) as ReturnType<typeof setTimeout>;
  const signal = controller.signal;
  signal.addEventListener("abort", () => clearTimeoutFn(id), { once: true });
  return { signal, clear: () => clearTimeoutFn(id) };
}

function mergeSignals(
  userSignal: AbortSignal | undefined,
  timeoutSignal: AbortSignal
): AbortSignal {
  if (!userSignal) return timeoutSignal;

  if (typeof AbortController === "undefined") {
    return timeoutSignal;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();

  userSignal.addEventListener("abort", abort, { once: true });
  timeoutSignal.addEventListener("abort", abort, { once: true });

  return controller.signal;
}

function normalizeApiError(error: ApiError | undefined, status: number): ApiError {
  if (
    error &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  ) {
    return error;
  }

  return {
    code: "HTTP_ERROR",
    details: {},
    message: `Erro HTTP ${status}.`
  };
}

/** Detecta o envelope de erro DO APP: `{error:"..."}` do `error_response` ou o
 *  envelope estruturado `{success:false, error:{...}}`. O authorizer do API
 *  Gateway, ao negar um token, responde 403 com corpo PRÓPRIO (`{message:"..."}`)
 *  — que não é o envelope do app. Essa distinção separa falha de AUTENTICAÇÃO
 *  (token ruim → limpar sessão) de falha de AUTORIZAÇÃO (papel insuficiente →
 *  manter sessão). */
function isAppErrorEnvelope(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  const record = payload as Record<string, unknown>;
  if (record.success === false) {
    return true;
  }
  if (typeof record.error === "string") {
    return true;
  }
  return typeof record.error === "object" && record.error !== null;
}

/** Extrai o `ApiError` preservando a mensagem real do backend (C3-01). O backend
 *  serverless devolve `{error:"<mensagem>"}` — antes descartada em favor de um
 *  genérico "Erro HTTP {status}". Retorna `undefined` quando não há mensagem
 *  utilizável, deixando `normalizeApiError` aplicar o fallback genérico. */
function extractApiError(
  payload: unknown,
  hasSuccessField: boolean
): ApiError | undefined {
  const record = (payload ?? {}) as Record<string, unknown>;
  if (hasSuccessField) {
    const structured = (payload as ApiErrorResponse).error;
    if (structured && typeof structured === "object") {
      return structured;
    }
  }
  if (typeof record.error === "string" && record.error.trim().length > 0) {
    return { code: "HTTP_ERROR", message: record.error, details: {} };
  }
  return undefined;
}

/** Falha que invalida a sessão do usuário: 401 sempre; 403 apenas quando NÃO é
 *  o envelope do app (i.e., o authorizer do API Gateway negou o token). Um 403
 *  de negócio (papel insuficiente) chega no envelope do app e mantém a sessão. */
function isAuthenticationFailure(status: number, payload: unknown): boolean {
  if (status === 401) {
    return true;
  }
  if (status === 403) {
    return !isAppErrorEnvelope(payload);
  }
  return false;
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
  const message = raw.message;

  return {
    success: true,
    data: raw.data as T,
    error: null,
    request_id:
      typeof raw.request_id === "string" ? raw.request_id : "frontend-local",
    source_mode: isSourceMode(raw.source_mode) ? raw.source_mode : "real",
    timestamp:
      typeof raw.timestamp === "string"
        ? raw.timestamp
        : new Date().toISOString(),
    ...(typeof message === "string" ? { message } : {})
  };
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly status: number;

  constructor(error: ApiError | undefined, status: number) {
    const normalizedError = normalizeApiError(error, status);

    super(normalizedError.message);
    this.name = "ApiClientError";
    this.code = normalizedError.code;
    this.details = normalizedError.details;
    this.status = status;
  }
}

export class ApiNetworkError extends Error {
  constructor(message = "API indisponivel.") {
    super(message);
    this.name = "ApiNetworkError";
  }
}

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base = resolveApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) {
    return normalizedPath;
  }
  return `${base}${normalizedPath}`;
}

function shouldSetJsonContentType(body: BodyInit | null | undefined): boolean {
  return Boolean(body) && !(body instanceof FormData);
}

export async function apiRequest<T>(
  path: string,
  options: ApiClientOptions = {}
): Promise<ApiSuccessResponse<T>> {
  const { token, timeoutMs, signal: userSignal, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);
  const bearerToken = token ?? getStoredToken();

  if (
    !requestHeaders.has("Content-Type") &&
    shouldSetJsonContentType(requestOptions.body)
  ) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (bearerToken) {
    requestHeaders.set("Authorization", `Bearer ${bearerToken}`);
  }

  const effectiveTimeoutMs =
    typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : DEFAULT_API_TIMEOUT_MS;
  const { signal: timeoutSignal, clear: clearTimeout } = createTimeoutSignal(effectiveTimeoutMs);
  const signal = mergeSignals(userSignal ?? undefined, timeoutSignal);

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      ...requestOptions,
      headers: requestHeaders,
      signal,
      cache: requestOptions.cache ?? "no-store"
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiNetworkError("A API não respondeu dentro do tempo limite.");
    }
    throw new ApiNetworkError();
  } finally {
    // C3-05: só limpa o timer — NÃO sinaliza abort (isso cancelaria o body da resposta
    // quando o caller passou seu próprio signal).
    clearTimeout();
  }

  let payload: ApiResponse<T> | { data: T };
  try {
    payload = (await response.json()) as ApiResponse<T> | { data: T };
  } catch {
    throw new ApiClientError(
      {
        code: "INVALID_RESPONSE",
        message: "Resposta inválida da API.",
        details: {}
      },
      response.status
    );
  }

  const hasSuccessField = typeof (payload as ApiResponse<T>).success === "boolean";
  const rawData = (payload as { data?: T }).data;

  if (!response.ok || (hasSuccessField && !(payload as ApiResponse<T>).success)) {
    const error = extractApiError(payload, hasSuccessField);

    // Sessão inválida no servidor: limpa a sessão local para o AuthGuard
    // redirecionar ao login. Dispara em 401 (com token) e em 403 de
    // AUTENTICAÇÃO — em produção o authorizer do API Gateway nega token ruim/
    // expirado com 403 e corpo próprio, sem o envelope do app (C3-02). NÃO
    // dispara em 403 de AUTORIZAÇÃO (papel insuficiente), preservando a sessão
    // de um usuário válido. clearStoredSession é no-op fora do browser (SSR/testes).
    if (bearerToken && isAuthenticationFailure(response.status, payload)) {
      clearStoredSession();
    }

    throw new ApiClientError(error, response.status);
  }

  if (!hasSuccessField && rawData !== undefined) {
    return normalizeApiSuccess({
      success: true,
      data: rawData,
      error: null,
      request_id: "frontend-local",
      source_mode: "real",
      timestamp: new Date().toISOString()
    });
  }

  return normalizeApiSuccess(payload);
}

// Coalescência de GETs em voo: chamadas idênticas e simultâneas (ex.: o
// NotificationBell global + a própria tela buscando a mesma lista no load)
// compartilham uma única requisição de rede. A entrada é removida assim que a
// promise resolve, então não há cache nem risco de dados desatualizados.
const inFlightGets = new Map<string, Promise<ApiSuccessResponse<unknown>>>();

function coalescedGet<T>(
  path: string,
  options?: ApiClientOptions
): Promise<ApiSuccessResponse<T>> {
  // Não coalesce quando há signal custom: evita que o abort de um chamador
  // cancele a requisição compartilhada de outro.
  if (options?.signal) {
    return apiRequest<T>(path, { ...options, method: "GET" });
  }

  const key = `GET ${path}`;
  const existing = inFlightGets.get(key) as
    | Promise<ApiSuccessResponse<T>>
    | undefined;
  if (existing) {
    return existing;
  }

  const promise = apiRequest<T>(path, { ...options, method: "GET" }).finally(
    () => {
      inFlightGets.delete(key);
    }
  );
  inFlightGets.set(key, promise as Promise<ApiSuccessResponse<unknown>>);
  return promise;
}

export const apiClient = {
  get: <T>(path: string, options?: ApiClientOptions) =>
    coalescedGet<T>(path, options),
  post: <T>(path: string, body: unknown, options?: ApiClientOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "POST",
      body: JSON.stringify(body)
    }),
  patch: <T>(path: string, body: unknown, options?: ApiClientOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  put: <T>(path: string, body: unknown, options?: ApiClientOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body)
    }),
  delete: <T>(path: string, options?: ApiClientOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "DELETE"
    }),
  postForm: <T>(path: string, body: FormData, options?: ApiClientOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "POST",
      body
    })
};
