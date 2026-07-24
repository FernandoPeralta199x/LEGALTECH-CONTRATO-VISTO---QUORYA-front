import { timingSafeEqual } from "node:crypto";

export class RequestSecurityError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "RequestSecurityError";
    this.status = status;
  }
}

function canonicalOrigin(value: string): string {
  try {
    const parsed = new URL(value);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error();
    }
    return parsed.origin;
  } catch {
    throw new Error("APP_ORIGIN deve conter somente uma origem HTTP(S) válida.");
  }
}

export function resolveAppOrigin(requestOrigin: string): string {
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured) {
    return canonicalOrigin(configured);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_ORIGIN não está configurado.");
  }
  return canonicalOrigin(requestOrigin);
}

export function assertSameOrigin(
  request: Request,
  expectedOrigin: string
): void {
  const expected = canonicalOrigin(expectedOrigin);
  const supplied = request.headers.get("origin");
  if (!supplied) {
    throw new RequestSecurityError("Origem da requisição ausente.");
  }

  let actual: string;
  try {
    actual = canonicalOrigin(supplied);
  } catch {
    throw new RequestSecurityError("Origem da requisição inválida.");
  }

  if (actual !== expected) {
    throw new RequestSecurityError("Origem da requisição não permitida.");
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new RequestSecurityError("Contexto cross-site não permitido.");
  }
}

function safeTokenEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.length >= 12 &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

export function assertCsrfProtection(
  request: Request,
  cookieToken: string | null | undefined,
  expectedOrigin: string
): void {
  assertSameOrigin(request, expectedOrigin);
  const headerToken = request.headers.get("x-csrf-token");

  if (
    !cookieToken ||
    !headerToken ||
    !safeTokenEqual(cookieToken, headerToken)
  ) {
    throw new RequestSecurityError("Token CSRF ausente ou inválido.");
  }
}
