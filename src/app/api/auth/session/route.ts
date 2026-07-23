import type { NextRequest } from "next/server";

import { generateCsrfToken } from "@/server/auth/sessionCookie";
import {
  clearAuthCookies,
  ensureCsrfCookie,
  readCsrfCookie,
  readSealedSession
} from "@/server/auth/routeSession";
import { fetchVerifiedSession } from "@/server/auth/sessionUser";
import { apiError, noStoreJson, safeBackendError } from "@/server/http/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const sealed = readSealedSession(request);
    if (!sealed) {
      const response = apiError(401, {
        code: "UNAUTHENTICATED",
        message: "Sessão ausente ou expirada."
      });
      clearAuthCookies(response);
      return response;
    }

    const verified = await fetchVerifiedSession(
      sealed.token,
      sealed.issuedAt,
      sealed.expiresAt
    );
    if (!verified.response.ok || !verified.session) {
      const response = verified.response.ok
        ? apiError(502, {
            code: "INVALID_SESSION_PROFILE",
            message: "O perfil da sessão retornado pelo backend é inválido."
          })
        : safeBackendError(verified.payload, verified.response.status);
      clearAuthCookies(response);
      return response;
    }

    const response = noStoreJson({
      data: { session: verified.session },
      error: null,
      success: true
    });
    ensureCsrfCookie(
      request,
      response,
      readCsrfCookie(request) ?? generateCsrfToken()
    );
    return response;
  } catch (error) {
    if (error instanceof TypeError || error instanceof DOMException) {
      return apiError(502, {
        code: "SESSION_SERVICE_UNAVAILABLE",
        message: "Não foi possível validar a sessão agora."
      });
    }
    return apiError(500, {
      code: "BFF_CONFIGURATION_ERROR",
      message: "Configuração segura do frontend indisponível."
    });
  }
}
