/**
 * Fonte unica de verdade para deteccao de ambiente de runtime no frontend.
 * Centraliza a politica de seguranca para nao duplicar checagens de NODE_ENV
 * espalhadas pelo codigo (evita divergencia de regra entre arquivos).
 */

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * O fallback de dados mock (dev only) está habilitado? Fail-closed em produção
 * (nunca serve mock em prod) e, fora dela, só quando a flag opt-in está ligada.
 * Mora aqui (lib) para que os stores locais possam gatear a LEITURA sem inverter
 * a dependência lib -> services (SEC-FE-01). Reexportado por services/fallback.
 */
export function isMockFallbackEnabled(): boolean {
  if (isProduction()) return false;
  return process.env.NEXT_PUBLIC_ENABLE_API_MOCK_FALLBACK === "true";
}

/**
 * Politica unica do projeto: nenhuma sessao/token ou PII pode ser persistida
 * no storage do browser (localStorage/sessionStorage) em producao.
 * O caminho de producao e BFF + cookie HttpOnly/Secure/SameSite.
 *
 * Fail-closed: lanca em producao. `context` identifica o chamador na mensagem.
 */
export function assertBrowserPersistDisallowedInProduction(context: string): void {
  if (isProduction()) {
    throw new Error(
      `[${context}] Persistir sessao/PII em storage do browser nao e permitido em producao. ` +
        "Use o BFF com cookie HttpOnly."
    );
  }
}
