"use client";

import { LOCAL_CASES_STORAGE_KEY } from "@/lib/localCases";
import { LOCAL_CLIENTS_STORAGE_KEY } from "@/lib/localClients";
import type { Session } from "@/types/auth";

const LEGACY_AUTH_STORAGE_KEY = "legaltech.dev.session.v1";
const SESSION_CHANGED_EVENT = "quorya-session-changed";
const CSRF_COOKIE_NAMES = ["__Host-quorya-csrf", "quorya_csrf"] as const;

export type SessionStatus =
  | "authenticated"
  | "error"
  | "loading"
  | "unauthenticated";

export type SessionState = {
  error: string | null;
  session: Session | null;
  status: SessionStatus;
};

let state: SessionState = {
  error: null,
  session: null,
  status: "loading"
};
let refreshPromise: Promise<SessionState> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
  }
}

function setState(next: SessionState): SessionState {
  state = next;
  emit();
  return state;
}

function clearLegacyBrowserData(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(LOCAL_CASES_STORAGE_KEY);
    window.localStorage.removeItem(LOCAL_CLIENTS_STORAGE_KEY);
  } catch {
    // O logout da sessão no servidor não pode depender do storage do browser.
  }
}

function parseSession(payload: unknown): Session | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const session = (data as { session?: unknown }).session;
  if (!session || typeof session !== "object") return null;

  const value = session as Record<string, unknown>;
  if (
    typeof value.email !== "string" ||
    typeof value.expiresAt !== "string" ||
    typeof value.issuedAt !== "string" ||
    typeof value.organizationId !== "string" ||
    typeof value.role !== "string" ||
    typeof value.userId !== "string"
  ) {
    return null;
  }
  return session as Session;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionSnapshot(): SessionState {
  return state;
}

export function getServerSessionSnapshot(): SessionState {
  return {
    error: null,
    session: null,
    status: "loading"
  };
}

export function setAuthenticatedSession(session: Session): void {
  clearLegacyBrowserData();
  setState({ error: null, session, status: "authenticated" });
}

export function markSessionUnauthenticated(): void {
  clearLegacyBrowserData();
  setState({ error: null, session: null, status: "unauthenticated" });
}

export function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  for (const item of document.cookie.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    const name = item.slice(0, separator).trim();
    if (!CSRF_COOKIE_NAMES.includes(name as (typeof CSRF_COOKIE_NAMES)[number])) {
      continue;
    }
    const value = decodeURIComponent(item.slice(separator + 1));
    if (value) return value;
  }
  return null;
}

export function refreshSession(): Promise<SessionState> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        method: "GET"
      });
      if (response.status === 401 || response.status === 403) {
        markSessionUnauthenticated();
        return state;
      }
      if (!response.ok) {
        return setState({
          error: "Não foi possível validar a sessão agora.",
          session: null,
          status: "error"
        });
      }
      const session = parseSession(await response.json());
      if (!session) {
        return setState({
          error: "O servidor retornou uma sessão inválida.",
          session: null,
          status: "error"
        });
      }
      setAuthenticatedSession(session);
      return state;
    } catch {
      return setState({
        error: "Serviço de sessão temporariamente indisponível.",
        session: null,
        status: "error"
      });
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function ensureCsrfToken(): Promise<string> {
  const existing = readCsrfToken();
  if (existing) return existing;
  await refreshSession();
  const refreshed = readCsrfToken();
  if (!refreshed) {
    throw new Error("Token CSRF indisponível. Atualize a página e tente novamente.");
  }
  return refreshed;
}

export async function logoutSession(): Promise<void> {
  const csrf = readCsrfToken() ?? (await ensureCsrfToken());
  const response = await fetch("/api/auth/logout", {
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "X-CSRF-Token": csrf
    },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error("Não foi possível encerrar a sessão com segurança.");
  }
  markSessionUnauthenticated();
}
