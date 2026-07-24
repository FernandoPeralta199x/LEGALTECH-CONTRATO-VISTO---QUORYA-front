/** Monta a query string de período dos endpoints financeiros. `from`/`to`
 *  (YYYY-MM-DD) só são anexados no período `custom` e quando ambos existem — o
 *  backend rejeita custom sem datas (400). Presets ignoram from/to. */
export function financialQuery(
  period: string,
  from?: string | null,
  to?: string | null
): string {
  const params = new URLSearchParams({ period });
  if (period === "custom" && from && to) {
    params.set("from", from);
    params.set("to", to);
  }
  return params.toString();
}
