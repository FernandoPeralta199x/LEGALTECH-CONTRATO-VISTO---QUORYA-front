import { NextResponse } from "next/server";

import { RequestSecurityError } from "@/server/auth/requestSecurity";

type ErrorPayload = {
  code: string;
  message: string;
};

export function noStoreJson<T>(
  payload: T,
  init: ResponseInit = {}
): NextResponse<T> {
  const response = NextResponse.json(payload, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export function apiError(
  status: number,
  { code, message }: ErrorPayload
): NextResponse {
  return noStoreJson(
    {
      error: {
        code,
        details: {},
        message
      },
      success: false
    },
    { status }
  );
}

export function requestSecurityErrorResponse(error: unknown): NextResponse {
  if (error instanceof RequestSecurityError) {
    return apiError(error.status, {
      code: "REQUEST_FORBIDDEN",
      message: error.message
    });
  }
  return apiError(500, {
    code: "BFF_CONFIGURATION_ERROR",
    message: "Configuração segura do frontend indisponível."
  });
}

export function safeBackendError(
  payload: unknown,
  status: number
): NextResponse {
  const record =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : null;
  const rawError = record?.error;
  const rawMessage = record?.message;

  if (typeof rawError === "string" && rawError.trim()) {
    return noStoreJson({ error: rawError }, { status });
  }
  if (
    typeof rawError === "object" &&
    rawError !== null &&
    typeof (rawError as Record<string, unknown>).message === "string"
  ) {
    return noStoreJson(
      {
        error: {
          code:
            typeof (rawError as Record<string, unknown>).code === "string"
              ? (rawError as Record<string, unknown>).code
              : "BACKEND_ERROR",
          details: {},
          message: (rawError as Record<string, unknown>).message
        },
        success: false
      },
      { status }
    );
  }
  if (typeof rawMessage === "string" && rawMessage.trim()) {
    return noStoreJson({ message: rawMessage }, { status });
  }

  return apiError(status >= 500 ? 502 : status, {
    code: "BACKEND_ERROR",
    message:
      status >= 500
        ? "O serviço de dados está temporariamente indisponível."
        : `A solicitação foi recusada (HTTP ${status}).`
  });
}
