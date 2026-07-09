/** Ordem canônica e rótulos dos métodos de pagamento — fonte única compartilhada
 *  entre o editor de pricing (/admin/pricing) e a Prévia (PricingPreview). */
export const METHOD_ORDER = ["pix", "boleto", "cartao", "debito"] as const;

export const METHOD_LABELS: Record<(typeof METHOD_ORDER)[number], string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão de crédito",
  debito: "Cartão de débito"
};
