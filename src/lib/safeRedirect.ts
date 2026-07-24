/**
 * Sanitiza o parâmetro `next` de redirect pós-login (A6 — open redirect).
 *
 * O valor vem de `searchParams` (controlado pelo atacante). Validar apenas
 * `startsWith("/")` é insuficiente: `//evil.com` e `/\evil.com` são URLs
 * PROTOCOL-RELATIVE que o navegador resolve para um host EXTERNO. Só aceitamos
 * um caminho interno absoluto (uma única "/" inicial, sem backslash nem
 * caracteres de controle); qualquer outra coisa cai no destino padrão seguro.
 */
export const DEFAULT_REDIRECT = "/dashboard";

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) < 0x20) {
      return true;
    }
  }
  return false;
}

export function sanitizeNextPath(next: string | null | undefined): string {
  if (typeof next !== "string" || next.length === 0) {
    return DEFAULT_REDIRECT;
  }
  // precisa ser um caminho absoluto interno...
  if (!next.startsWith("/")) {
    return DEFAULT_REDIRECT;
  }
  // ...mas NÃO protocol-relative ("//host") nem a variante com backslash ("/\host")
  if (next.startsWith("//") || next.startsWith("/\\")) {
    return DEFAULT_REDIRECT;
  }
  // backslash (browsers normalizam "\" -> "/") ou caracteres de controle => rejeita
  if (next.includes("\\") || hasControlChars(next)) {
    return DEFAULT_REDIRECT;
  }
  return next;
}
