"use client";

import { Notification } from "@/components/Notification";
import { usePricingCatalog } from "@/components/pricing/PricingCatalogContext";
import { PRODUTOS, type Produto } from "@/lib/produtoConfig";

import { ProductCard } from "./ProductCard";

type ProductStepProps = {
  produto: Produto | null;
  onChange: (produto: Produto) => void;
};

export function ProductStep({ produto, onChange }: ProductStepProps) {
  const produtos = Object.keys(PRODUTOS) as Produto[];
  // Consome o estado do catálogo para ser HONESTO quando ele falha: sem isto, uma queda
  // do GET /pricing degradava em silêncio para preços locais (que ignoram overrides da org).
  const { error: catalogError } = usePricingCatalog();

  function handleProductSelect(selectedProduto: Produto) {
    onChange(selectedProduto);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
          Qual produto jurídico orienta este pedido?
        </h2>
        <p className="mt-1 text-sm text-[var(--text2)]">
          A escolha define o tipo de análise e os módulos sugeridos.
        </p>
      </div>

      {catalogError && (
        <Notification tone="warning" title="Preços em modo estimativa">
          Não foi possível carregar o catálogo de preços do servidor. Os valores exibidos são
          estimativas locais (marcadas com “~”) e podem divergir do que será cobrado no pedido.
        </Notification>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {produtos.map((p) => (
          <ProductCard
            key={p}
            onSelect={() => handleProductSelect(p)}
            produto={p}
            selected={produto === p}
          />
        ))}
      </div>
    </div>
  );
}
