import type { NextRequest } from "next/server";

import {
  generateCsrfToken,
  requireCookieSecret,
  sealSessionCookie
} from "@/server/auth/sessionCookie";
import { requireLoginCredentials } from "@/server/auth/credentials";
import { assertSameOrigin, resolveAppOrigin } from "@/server/auth/requestSecurity";
import { setAuthCookies } from "@/server/auth/routeSession";
import { fetchVerifiedSession } from "@/server/auth/sessionUser";
import {
  extractBackendData,
  fetchBackend,
  readBackendJson
} from "@/server/backend/client";
import { readJsonBody, RequestBodyError } from "@/server/http/requestBody";
import {
  apiError,
  noStoreJson,
  requestSecurityErrorResponse,
  safeBackendError
} from "@/server/http/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BackendLoginResult = {
  access_token?: unknown;
  expires_in?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request, resolveAppOrigin(request.nextUrl.origin));
    const credentials = requireLoginCredentials(
      await readJsonBody<unknown>(request)
    );
    const upstream = await fetchBackend("/api/v1/auth/login", {
      body: JSON.stringify(credentials),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const payload = await readBackendJson(upstream);
    if (!upstream.ok) {
      return safeBackendError(payload, upstream.status);
    }

    const login = extractBackendData<BackendLoginResult>(payload);
    if (
      !login ||
      typeof login.access_token !== "string" ||
      login.access_token.length === 0 ||
      typeof login.expires_in !== "number" ||
      !Number.isFinite(login.expires_in) ||
      login.expires_in <= 0
    ) {
      return apiError(502, {
        code: "INVALID_AUTH_RESPONSE",
        message: "O serviço de autenticação retornou uma resposta inválida."
      });
    }

    const issuedAt = Date.now();
    const maxAge = Math.min(Math.floor(login.expires_in), 86_400);
    const expiresAt = issuedAt + maxAge * 1_000;
    const verified = await fetchVerifiedSession(
      login.access_token,
      issuedAt,
      expiresAt
    );
    if (!verified.response.ok) {
      return safeBackendError(verified.payload, verified.response.status);
    }
    if (!verified.session) {
      return apiError(502, {
        code: "INVALID_SESSION_PROFILE",
        message: "O perfil da sessão retornado pelo backend é inválido."
      });
    }

    const sealed = sealSessionCookie(
      {
        expiresAt,
        issuedAt,
        token: login.access_token
      },
      requireCookieSecret()
    );
    const csrfToken = generateCsrfToken();
    const response = noStoreJson({
      data: { session: verified.session },
      error: null,
      success: true
    });
    setAuthCookies(response, sealed, csrfToken, maxAge);
    return response;
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return apiError(error.status, {
        code: "INVALID_REQUEST",
        message: error.message
      });
    }
    if (error instanceof TypeError || error instanceof DOMException) {
      return apiError(502, {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: "O serviço de autenticação está temporariamente indisponível."
      });
    }
    return requestSecurityErrorResponse(error);
  }
}
