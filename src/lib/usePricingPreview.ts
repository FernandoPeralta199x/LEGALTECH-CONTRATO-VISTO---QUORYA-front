"use client";

import { useEffect, useRef, useState } from "react";

import {
  estimatePricing,
  type PricingCatalog,
  type PricingEstimate
} from "@/services/pricing";
import { errorMessage } from "@/lib/errorMessage";

/** Prévia de pricing (F): busca o estimate da config SALVA para um produto. Reage à troca
 *  de produto (com skeleton) e à versão do config (refetch após salvar, sem piscar). É a
 *  DONA do payment_mode (seam mock — falha não bloqueia a tela e mantém o aviso conservador
 *  de simulação). Extraído de admin/pricing (fe-struct-02).
 *
 *  Recebe `catalog` e `configVersion` do usePricingConfigForm: o produto inicial nasce do
 *  catálogo e o refetch pós-save observa config.version. */
export function usePricingPreview(options: {
  catalog: PricingCatalog | null;
  configVersion: number | undefined;
}) {
  const { catalog, configVersion } = options;

  const [previewProduct, setPreviewProduct] = useState("");
  const [previewEstimate, setPreviewEstimate] = useState<PricingEstimate | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState("mock");
  const lastPreviewProduct = useRef<string>("");

  // Produto inicial da prévia = primeiro do catálogo (equivale ao setPreviewProduct dentro
  // do loadAll original). Defer via setTimeout(0) para não fazer setState síncrono no efeito;
  // só semeia enquanto vazio — a troca manual do usuário vence. Fallback "analise_contratual"
  // (product_type — valor técnico) preservado.
  useEffect(() => {
    if (!catalog || previewProduct) return;
    const t = window.setTimeout(() => {
      setPreviewProduct(catalog.products[0]?.code ?? "analise_contratual");
    }, 0);
    return () => window.clearTimeout(t);
  }, [catalog, previewProduct]);

  useEffect(() => {
    if (!previewProduct) return;
    let cancelled = false;
    // defer (setTimeout 0): mantém os setState fora do corpo síncrono do efeito.
    const t = window.setTimeout(() => {
      // Troca de produto: zera o estimate para exibir skeleton (evita mostrar os números do
      // produto anterior). Refetch por versão (após salvar) não pisca.
      const productChanged = lastPreviewProduct.current !== previewProduct;
      lastPreviewProduct.current = previewProduct;
      if (productChanged) setPreviewEstimate(null);
      setPreviewLoading(true);
      setPreviewError(null);
      void estimatePricing(previewProduct, [])
        .then((est) => {
          if (cancelled) return;
          setPreviewEstimate(est);
          setPaymentMode(est.payment_mode || "mock");
        })
        .catch((err) => {
          if (cancelled) return;
          setPreviewEstimate(null);
          setPreviewError(errorMessage(err, "Prévia indisponível."));
          setPaymentMode("mock");
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [previewProduct, configVersion]);

  return {
    previewProduct,
    setPreviewProduct,
    previewEstimate,
    previewLoading,
    previewError,
    paymentMode
  };
}
