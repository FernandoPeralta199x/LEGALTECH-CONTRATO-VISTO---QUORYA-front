"use client";

import { useCallback, useMemo } from "react";

import {
  usePricingCatalog,
  usePricingLookup,
  usePricingMatrix,
} from "@/components/pricing/PricingCatalogContext";
import {
  computeProductBasePrice,
  estimarPrazoHoras,
  MATRIZ,
  MODULOS,
  PRODUTOS,
  type Modulo,
  type Produto
} from "@/lib/produtoConfig";

import { EstimateCard } from "./EstimateCard";
import { ModuleRow } from "./ModuleRow";

type ModulesStepProps = {
  produto: Produto;
  state: Record<Modulo, boolean>;
  onChange: (state: Record<Modulo, boolean>) => void;
};

export function ModulesStep({ produto, state, onChange }: ModulesStepProps) {
  const matriz = useMemo(() => MATRIZ[produto], [produto]);
  const modulos = useMemo(() => Object.keys(matriz) as Modulo[], [matriz]);
  const { products, modules } = usePricingLookup();
  const matrix = usePricingMatrix();
  const { isLoading: catalogLoading, error: catalogError } = usePricingCatalog();

  const isRequired = useCallback(
    (modulo: Modulo): boolean => {
      const remote = matrix[produto]?.[modulo];
      if (remote) return remote.required === true || remote.obrigatorio === true;
      return matriz[modulo]?.obrigatorio === true;
    },
    [matrix, produto, matriz]
  );

  const ativos = useMemo(
    () => modulos.filter((m) => state[m]),
    [modulos, state]
  );

  const backendProductCents = products.get(PRODUTOS[produto].code)?.base_price_cents;
  const productCents = backendProductCents ?? computeProductBasePrice(produto);

  // Marca o total como estimativa quando algum valor veio do fallback local
  // (catálogo do backend indisponível ou incompleto) — sem mascarar a origem.
  const usesLocalFallback = useMemo(() => {
    if (backendProductCents === undefined) return true;
    const includeRequired = produto === "reuniao_equipe";
    return ativos.some((modulo) => {
      if (!includeRequired && isRequired(modulo)) return false;
      return modules.get(MODULOS[modulo].code)?.price_cents === undefined;
    });
  }, [backendProductCents, ativos, modules, produto, isRequired]);

  const valor = useMemo(() => {
    // O preço base do produto já engloba os módulos obrigatórios (bloqueados).
    // Somente módulos opcionais ativados pelo usuário incrementam o valor.
    //
    // Exceção: para `reuniao_equipe`, base = 0 e os módulos "fixo no roteiro"
    // são opt-in — eles também devem somar quando ativos.
    const includeRequired = produto === "reuniao_equipe";
    const optionalTotal = ativos.reduce((sum, modulo) => {
      if (!includeRequired && isRequired(modulo)) return sum;
      const code = MODULOS[modulo].code;
      const price = modules.get(code)?.price_cents ?? MODULOS[modulo].precoCents;
      return sum + price;
    }, 0);
    return productCents + optionalTotal;
  }, [ativos, modules, produto, productCents, isRequired]);

  const prazo = useMemo(() => estimarPrazoHoras(produto, ativos), [produto, ativos]);

  // Distingue "carregando" de "falhou": durante o load NÃO alarma (evita "indisponível" no
  // carregamento normal); sinaliza só quando o catálogo realmente falhou (estimativa pode
  // divergir do cobrado) ou quando parte dos itens caiu no fallback local após o load concluir.
  const estimateNotice = catalogError
    ? "Catálogo de preços indisponível — os valores são estimativas locais e podem divergir do que será cobrado."
    : !catalogLoading && usesLocalFallback
      ? "Catálogo do servidor indisponível para parte dos itens."
      : null;

  function toggle(modulo: Modulo, value: boolean) {
    onChange({ ...state, [modulo]: value });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
          Ajuste a composição simulada
        </h2>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Inclua módulos na simulação do pedido. Eles compõem o roteiro local
          e não acionam consulta externa, IA/OCR/RAG ou integração real nesta
          versão; essas capacidades seguem no roadmap.
        </p>
      </div>

      <div className="space-y-3">
        {modulos.map((m) => (
          <ModuleRow
            checked={state[m] ?? false}
            config={matriz[m]}
            key={m}
            modulo={m}
            onCheckedChange={(value) => toggle(m, value)}
          />
        ))}
      </div>

      <EstimateCard
        error={estimateNotice}
        prazoHoras={prazo}
        valorCents={valor}
      />
    </div>
  );
}
