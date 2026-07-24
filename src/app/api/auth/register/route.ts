import type { NextRequest } from "next/server";

import { requireRegistrationInput } from "@/server/auth/credentials";
import { assertSameOrigin, resolveAppOrigin } from "@/server/auth/requestSecurity";
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

type BackendRegisterResult = {
  organization_id?: unknown;
  role?: unknown;
  user_id?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request, resolveAppOrigin(request.nextUrl.origin));
    const input = requireRegistrationInput(
      await readJsonBody<unknown>(request)
    );
    const upstream = await fetchBackend("/api/v1/users", {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const payload = await readBackendJson(upstream);
    if (!upstream.ok) {
      return safeBackendError(payload, upstream.status);
    }

    const data = extractBackendData<BackendRegisterResult>(payload);
    if (!data || typeof data.user_id !== "string") {
      return apiError(502, {
        code: "INVALID_REGISTER_RESPONSE",
        message: "O serviço de cadastro retornou uma resposta inválida."
      });
    }

    return noStoreJson({
      data: {
        email: input.email,
        message: "Conta criada com sucesso.",
        status: "active",
        user_id: data.user_id
      },
      error: null,
      success: true
    });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return apiError(error.status, {
        code: "INVALID_REQUEST",
        message: error.message
      });
    }
    if (error instanceof TypeError || error instanceof DOMException) {
      return apiError(502, {
        code: "REGISTER_SERVICE_UNAVAILABLE",
        message: "O serviço de cadastro está temporariamente indisponível."
      });
    }
    return requestSecurityErrorResponse(error);
  }
}
