import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  assertCsrfProtection,
  resolveAppOrigin
} from "@/server/auth/requestSecurity";
import {
  clearAuthCookies,
  readCsrfCookie,
  readSealedSession
} from "@/server/auth/routeSession";
import {
  fetchBackend,
  isBackendAppError
} from "@/server/backend/client";
import {
  readLimitedBody,
  RequestBodyError
} from "@/server/http/requestBody";
import {
  apiError,
  requestSecurityErrorResponse
} from "@/server/http/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SAFE_METHODS = new Set(["GET", "HEAD"]);
const FORWARDED_REQUEST_HEADERS = ["accept", "content-type", "if-none-match"];
const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "etag",
  "last-modified",
  "x-request-id"
];

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function authenticationFailure(status: number, body: Uint8Array): boolean {
  if (status === 401) return true;
  if (status !== 403) return false;
  try {
    return !isBackendAppError(
      JSON.parse(new TextDecoder().decode(body)) as unknown
    );
  } catch {
    return true;
  }
}

async function handle(request: NextRequest, context: RouteContext) {
  let response: NextResponse | null = null;
  try {
    const sealed = readSealedSession(request);
    if (!sealed) {
      response = apiError(401, {
        code: "UNAUTHENTICATED",
        message: "Sessão ausente ou expirada."
      });
      clearAuthCookies(response);
      return response;
    }

    if (!SAFE_METHODS.has(request.method)) {
      assertCsrfProtection(
        request,
        readCsrfCookie(request),
        resolveAppOrigin(request.nextUrl.origin)
      );
    }

    const { path } = await context.params;
    const pathname = `/${path.join("/")}`;
    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const body = SAFE_METHODS.has(request.method)
      ? undefined
      : await readLimitedBody(request);
    const upstream = await fetchBackend(pathname, {
      body,
      headers,
      method: request.method,
      search: request.nextUrl.search,
      token: sealed.token
    });
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    const responseHeaders = new Headers({
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache"
    });
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    response = new NextResponse(
      upstream.status === 204 || request.method === "HEAD" ? null : bytes,
      {
        headers: responseHeaders,
        status: upstream.status
      }
    );
    if (authenticationFailure(upstream.status, bytes)) {
      clearAuthCookies(response);
    }
    return response;
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return apiError(error.status, {
        code: "INVALID_REQUEST_BODY",
        message: error.message
      });
    }
    if (error instanceof TypeError || error instanceof DOMException) {
      return apiError(502, {
        code: "BACKEND_UNAVAILABLE",
        message: "O serviço de dados está temporariamente indisponível."
      });
    }
    return requestSecurityErrorResponse(error);
  }
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
