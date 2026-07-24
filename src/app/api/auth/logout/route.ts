import type { NextRequest } from "next/server";

import {
  assertCsrfProtection,
  resolveAppOrigin
} from "@/server/auth/requestSecurity";
import {
  clearAuthCookies,
  readCsrfCookie
} from "@/server/auth/routeSession";
import {
  noStoreJson,
  requestSecurityErrorResponse
} from "@/server/http/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertCsrfProtection(
      request,
      readCsrfCookie(request),
      resolveAppOrigin(request.nextUrl.origin)
    );
    const response = noStoreJson({
      data: null,
      error: null,
      success: true
    });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
}
