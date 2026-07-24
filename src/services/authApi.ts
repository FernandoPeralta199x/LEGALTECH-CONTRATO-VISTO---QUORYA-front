import { setAuthenticatedSession } from "@/lib/sessionClient";
import { ApiClientError, ApiNetworkError } from "@/services/apiClient";
import type { Session } from "@/types/auth";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
  role: string;
}

export interface RegisterResult {
  email: string;
  message: string;
  status: string;
  user_id: string;
}

type AuthEnvelope<T> = {
  data?: T;
  error?: { code?: string; message?: string } | string | null;
  success?: boolean;
};

async function authRequest<T>(path: string, payload: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      body: JSON.stringify(payload),
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  } catch {
    throw new ApiNetworkError("Serviço de autenticação indisponível.");
  }

  let envelope: AuthEnvelope<T>;
  try {
    envelope = (await response.json()) as AuthEnvelope<T>;
  } catch {
    throw new ApiClientError(
      {
        code: "INVALID_AUTH_RESPONSE",
        details: {},
        message: "Resposta inválida do serviço de autenticação."
      },
      response.status
    );
  }

  if (!response.ok || envelope.success === false || envelope.data === undefined) {
    const structured =
      envelope.error && typeof envelope.error === "object"
        ? envelope.error
        : null;
    throw new ApiClientError(
      {
        code: structured?.code ?? "AUTH_ERROR",
        details: {},
        message:
          structured?.message ??
          (typeof envelope.error === "string"
            ? envelope.error
            : `Erro HTTP ${response.status}.`)
      },
      response.status
    );
  }
  return envelope.data;
}

export async function login(payload: LoginPayload): Promise<Session> {
  const data = await authRequest<{ session: Session }>("/api/auth/login", payload);
  setAuthenticatedSession(data.session);
  return data.session;
}

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  return authRequest<RegisterResult>("/api/auth/register", {
    email: payload.email,
    name: payload.name,
    password: payload.password
  });
}
