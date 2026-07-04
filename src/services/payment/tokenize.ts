// src/services/payment/tokenize.ts
import { isValidCpf } from "@/lib/cpfCnpj";

export type RawCard = { number: string; exp: string; cvv: string; holder: string; cpf: string };
export type CardToken = { token: string; last4: string; brand: string };

export function luhnValid(digits: string): boolean {
  const n = digits.replace(/\D/g, "");
  if (n.length < 13 || n.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function cardBrand(digits: string): string {
  const n = digits.replace(/\D/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^(4011|4312|4389|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) return "elo";
  return "desconhecida";
}

export function validExp(exp: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(exp.trim());
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const last = new Date(year, month, 0, 23, 59, 59);
  return last.getTime() >= Date.now();
}

/**
 * MOCK dev-only: valida (só UX) e devolve token fictício + last4/brand como HINTS.
 * Os dados crus são descartados aqui — nunca vão à rede, ao log ou ao localStorage.
 * Real (futuro): substituir o corpo por gateway.tokenize(...) / hosted fields (SAQ A).
 */
export async function tokenizeCard(card: RawCard): Promise<CardToken> {
  const number = card.number.replace(/\D/g, "");
  if (!luhnValid(number)) throw new Error("card_invalid");
  if (!validExp(card.exp)) throw new Error("exp_invalid");
  if (!/^\d{3,4}$/.test(card.cvv.trim())) throw new Error("cvv_invalid");
  if (!card.holder.trim()) throw new Error("holder_invalid");
  if (!isValidCpf(card.cpf)) throw new Error("cpf_invalid");
  const uuid =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { token: `tok_mock_${uuid}`, last4: number.slice(-4), brand: cardBrand(number) };
}
