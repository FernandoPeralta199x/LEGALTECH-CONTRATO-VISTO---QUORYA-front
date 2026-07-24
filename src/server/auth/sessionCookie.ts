import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from "node:crypto";

const COOKIE_VERSION = "v1";
const COOKIE_AAD = Buffer.from("quorya-session-cookie:v1", "utf8");
const MAX_COOKIE_TOKEN_LENGTH = 3_200;
const MAX_SEALED_COOKIE_LENGTH = 3_800;
const MAX_SESSION_AGE_SECONDS = 86_400;

export const DEV_SESSION_COOKIE = "quorya_session";
export const DEV_CSRF_COOKIE = "quorya_csrf";
export const PROD_SESSION_COOKIE = "__Host-quorya-session";
export const PROD_CSRF_COOKIE = "__Host-quorya-csrf";

export type SealedSession = {
  expiresAt: number;
  issuedAt: number;
  token: string;
};

function keyFromSecret(secret: string): Buffer {
  if (secret.length < 32) {
    throw new Error(
      "AUTH_COOKIE_SECRET deve ter pelo menos 32 caracteres aleatórios."
    );
  }

  return createHash("sha256").update(secret, "utf8").digest();
}

function isSealedSession(value: unknown): value is SealedSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.token === "string" &&
    record.token.length > 0 &&
    record.token.length <= MAX_COOKIE_TOKEN_LENGTH &&
    typeof record.expiresAt === "number" &&
    Number.isFinite(record.expiresAt) &&
    typeof record.issuedAt === "number" &&
    Number.isFinite(record.issuedAt) &&
    record.issuedAt <= record.expiresAt
  );
}

export function requireCookieSecret(
  value = process.env.AUTH_COOKIE_SECRET
): string {
  const secret = value?.trim();
  if (!secret) {
    throw new Error("AUTH_COOKIE_SECRET não está configurado.");
  }
  keyFromSecret(secret);
  return secret;
}

/**
 * Sela o JWT do backend com AES-256-GCM. O navegador recebe apenas o envelope
 * cifrado em cookie HttpOnly; o token bruto nunca fica disponível ao JavaScript.
 */
export function sealSessionCookie(
  payload: SealedSession,
  secret = requireCookieSecret()
): string {
  if (!isSealedSession(payload)) {
    throw new Error("Sessão inválida para serialização.");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  cipher.setAAD(COOKIE_AAD);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  const sealed = [
    COOKIE_VERSION,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url")
  ].join(".");
  if (sealed.length > MAX_SEALED_COOKIE_LENGTH) {
    throw new Error("Token excede o limite seguro do cookie de sessão.");
  }
  return sealed;
}

export function unsealSessionCookie(
  value: string | null | undefined,
  secret = requireCookieSecret(),
  now = Date.now()
): SealedSession | null {
  if (!value) {
    return null;
  }

  try {
    const [version, ivPart, ciphertextPart, tagPart, extra] = value.split(".");
    if (
      version !== COOKIE_VERSION ||
      !ivPart ||
      !ciphertextPart ||
      !tagPart ||
      extra !== undefined
    ) {
      return null;
    }

    const decodeCanonical = (part: string): Buffer | null => {
      const decoded = Buffer.from(part, "base64url");
      return decoded.toString("base64url") === part ? decoded : null;
    };
    const iv = decodeCanonical(ivPart);
    const ciphertext = decodeCanonical(ciphertextPart);
    const tag = decodeCanonical(tagPart);
    if (!iv || !ciphertext || !tag || iv.byteLength !== 12 || tag.byteLength !== 16) {
      return null;
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyFromSecret(secret),
      iv
    );
    decipher.setAAD(COOKIE_AAD);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]).toString("utf8");
    const parsed = JSON.parse(plaintext) as unknown;

    if (!isSealedSession(parsed) || parsed.expiresAt <= now) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function isSecureCookieRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function sessionCookieName(
  secure = isSecureCookieRuntime()
): string {
  return secure ? PROD_SESSION_COOKIE : DEV_SESSION_COOKIE;
}

export function csrfCookieName(secure = isSecureCookieRuntime()): string {
  return secure ? PROD_CSRF_COOKIE : DEV_CSRF_COOKIE;
}

export function sessionCookieOptions(maxAge: number, secure: boolean) {
  const safeMaxAge = Math.max(
    1,
    Math.min(Math.floor(maxAge), MAX_SESSION_AGE_SECONDS)
  );

  return {
    httpOnly: true,
    maxAge: safeMaxAge,
    path: "/",
    sameSite: "lax" as const,
    secure
  };
}

export function csrfCookieOptions(secure: boolean) {
  return {
    httpOnly: false,
    path: "/",
    sameSite: "strict" as const,
    secure
  };
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}
