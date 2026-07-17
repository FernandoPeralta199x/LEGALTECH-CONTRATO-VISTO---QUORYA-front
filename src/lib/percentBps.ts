/**
 * Par round-trip do campo de juros (basis points <-> texto pt-BR) do
 * InstallmentConfigCard. Vive aqui (não em formatters.ts, que é DISPLAY) porque é
 * o valor de um input editável e seu inverso — mantê-los juntos e isolados evita
 * acoplar o formato do formulário a uma futura mudança dos labels de exibição.
 */

/** basis points -> texto pt-BR ("1250" -> "12,5", "100000" -> "1.000"). */
export function bpsToPercentLabel(bps: number): string {
  return (bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/**
 * Texto pt-BR -> basis points, inverso de bpsToPercentLabel. Trata corretamente
 * o separador de milhar pt-BR (ponto): antes, "1.000" virava 1 (Number lê o ponto
 * como decimal) e o round-trip de juros >= 1000% quebrava.
 *
 * Regras (pt-BR): a vírgula é o separador decimal; o ponto é separador de milhar,
 * EXCETO quando é claramente um decimal digitado à moda internacional ("12.5").
 * Desambiguação sem vírgula: um único ponto seguido de 1-2 dígitos é decimal;
 * um ponto seguido de 3 dígitos, ou múltiplos pontos, é separador de milhar.
 */
export function parsePercentToBps(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let normalized: string;
  if (trimmed.includes(",")) {
    // vírgula = decimal pt-BR; pontos = separador de milhar
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (/^\d*\.\d{1,2}$/.test(trimmed)) {
    // um ponto seguido de 1-2 dígitos: decimal digitado ("12.5", "1.25", ".5")
    // (\d* aceita ponto-líder sem zero: ".5" -> 0,5%, não milhar)
    normalized = trimmed;
  } else {
    // ponto(s) como separador de milhar ("1.000" -> "1000", "1.000.000")
    normalized = trimmed.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}