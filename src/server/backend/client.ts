import { buildBackendUrl, resolveBackendBaseUrl } from "./config";

const DEFAULT_BACKEND_TIMEOUT_MS = 30_000;

export type BackendFetchOptions = {
  body?: BodyInit | null;
  headers?: HeadersInit;
  method?: string;
  search?: string;
  timeoutMs?: number;
  token?: string;
};

export async function fetchBackend(
  pathname: string,
  options: BackendFetchOptions = {}
): Promise<Response> {
  const {
    body,
    headers: initialHeaders,
    method = "GET",
    search = "",
    timeoutMs = DEFAULT_BACKEND_TIMEOUT_MS,
    token
  } = options;
  const headers = new Headers(initialHeaders);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(
    buildBackendUrl(resolveBackendBaseUrl(), pathname, search),
    {
      body,
      cache: "no-store",
      headers,
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs)
    }
  );
}

export function extractBackendData<T>(payload: unknown): T | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if ("data" in record) {
    return record.data as T;
  }
  return null;
}

export function isBackendAppError(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  const record = payload as Record<string, unknown>;
  return (
    record.success === false ||
    typeof record.error === "string" ||
    (typeof record.error === "object" && record.error !== null)
  );
}

export async function readBackendJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
