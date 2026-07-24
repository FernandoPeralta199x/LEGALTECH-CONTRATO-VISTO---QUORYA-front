/** Formata o tempo restante (ms) da cobrança Pix como "m:ss". <= 0 ou inválido → "expirado".
 *  Função pura (testável em node:test) — a contagem em tempo real fica no componente. */
export function formatCountdown(msRemaining: number): string {
  if (!Number.isFinite(msRemaining) || msRemaining <= 0) {
    return "expirado";
  }
  const totalSeconds = Math.floor(msRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
