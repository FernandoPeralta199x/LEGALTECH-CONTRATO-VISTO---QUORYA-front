import type { PaymentMethod } from "@/types";

/** Ordem canônica, rótulos e predicados dos métodos de pagamento — fonte ÚNICA
 *  compartilhada por todo o frontend (editor de pricing, Prévia, wizard, cards
 *  do caso e comprovante). Evita mapas/ordens divergentes por arquivo (DS-01).
 *
 *  `satisfies` mantém o tipo-tupla literal (consumidores preservam narrowing) e
 *  ao mesmo tempo garante que a ordem só contenha `PaymentMethod` válidos. */
export const METHOD_ORDER = ["pix", "boleto", "cartao", "debito"] as const satisfies readonly PaymentMethod[];

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão de crédito",
  debito: "Cartão de débito"
};

/** Cartões (crédito e débito) — únicos métodos que carregam last4/brand. */
export const CARD_METHODS = ["cartao", "debito"] as const satisfies readonly PaymentMethod[];

/** Type guard: `value` é um método de pagamento reconhecido. */
export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (METHOD_ORDER as readonly string[]).includes(value);
}

/** Type guard: `value` é um cartão (crédito ou débito). */
export function isCardMethod(
  value: PaymentMethod | null | undefined
): value is "cartao" | "debito" {
  return value === "cartao" || value === "debito";
}

/** Rótulo do método com fallback seguro para valores fora do catálogo. */
export function methodLabel(method: string): string {
  return METHOD_LABELS[method as PaymentMethod] ?? method;
}
