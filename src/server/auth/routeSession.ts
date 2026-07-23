import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  DEV_CSRF_COOKIE,
  DEV_SESSION_COOKIE,
  PROD_CSRF_COOKIE,
  PROD_SESSION_COOKIE,
  csrfCookieName,
  csrfCookieOptions,
  isSecureCookieRuntime,
  requireCookieSecret,
  sessionCookieName,
  sessionCookieOptions,
  unsealSessionCookie,
  type SealedSession
} from "./sessionCookie";

export function readSealedSession(request: NextRequest): SealedSession | null {
  const secure = isSecureCookieRuntime();
  const value = request.cookies.get(sessionCookieName(secure))?.value;
  return unsealSessionCookie(value, requireCookieSecret());
}

export function setAuthCookies(
  response: NextResponse,
  sealedSession: string,
  csrfToken: string,
  maxAge: number
): void {
  const secure = isSecureCookieRuntime();
  response.cookies.set(
    sessionCookieName(secure),
    sealedSession,
    sessionCookieOptions(maxAge, secure)
  );
  response.cookies.set(
    csrfCookieName(secure),
    csrfToken,
    csrfCookieOptions(secure)
  );
}

export function ensureCsrfCookie(
  request: NextRequest,
  response: NextResponse,
  token: string
): void {
  const secure = isSecureCookieRuntime();
  if (!request.cookies.get(csrfCookieName(secure))?.value) {
    response.cookies.set(
      csrfCookieName(secure),
      token,
      csrfCookieOptions(secure)
    );
  }
}

export function clearAuthCookies(response: NextResponse): void {
  const secure = isSecureCookieRuntime();
  const sessionOptions = {
    ...sessionCookieOptions(1, secure),
    expires: new Date(0),
    maxAge: 0
  };
  const csrfOptions = {
    ...csrfCookieOptions(secure),
    expires: new Date(0),
    maxAge: 0
  };

  for (const name of new Set([
    sessionCookieName(secure),
    DEV_SESSION_COOKIE,
    PROD_SESSION_COOKIE
  ])) {
    response.cookies.set(name, "", sessionOptions);
  }
  for (const name of new Set([
    csrfCookieName(secure),
    DEV_CSRF_COOKIE,
    PROD_CSRF_COOKIE
  ])) {
    response.cookies.set(name, "", csrfOptions);
  }
}

export function readCsrfCookie(request: NextRequest): string | null {
  const secure = isSecureCookieRuntime();
  return request.cookies.get(csrfCookieName(secure))?.value ?? null;
}
