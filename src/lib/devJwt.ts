/**
 * Decode compartilhado do JWT dev — fonte única do base64url -> JSON usado
 * tanto pela validação do formulário de login (validation.ts) quanto pela
 * criação de sessão (services/auth.ts).
 *
 * IMPORTANTE: apenas o DECODE é compartilhado. As políticas de claims são
 * deliberadamente diferentes e continuam nos chamadores:
 *  - validateDevJwtForm (UX do form): mensagens amigáveis, aceita role string;
 *  - requireDevJwtClaims (sessão): estrita, exige role em DEV_ROLES e lança.
 */

/** Decodifica um segmento base64url de JWT para objeto JSON (null se inválido). */
export function decodeJwtSegment(segment: string): Record<string, unknown> | null {
  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    const decoded = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    return typeof decoded === "object" && decoded !== null
      ? (decoded as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Payload (2ª parte) de um JWT com 3 partes; null para formato inválido. */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  return decodeJwtSegment(parts[1]);
}
