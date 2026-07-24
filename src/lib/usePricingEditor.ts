"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { normalizeInstallmentConfig } from "@/components/pricing/InstallmentConfigCard";
import { errorMessage } from "@/lib/errorMessage";
import { METHOD_ORDER } from "@/lib/paymentMethods";
import { useToast } from "@/lib/useToast";
import {
  checkCasesLimit,
  estimatePricing,
  getPricingCatalog,
  getPricingConfig,
  updatePricingConfig,
  type CasesLimitCheck,
  type InstallmentConfig,
  type PricingCatalog,
  type PricingConfig,
  type PricingEstimate,
  type UpdatePricingConfigPayload
} from "@/services/pricing";

export type PricingStatus = "idle" | "loading" | "saving" | "success" | "error";

/**
 * Estado e regras do editor de Pricing (carregamento, formulário, prévia, validações
 * de pagabilidade e salvar/resetar) — extraído de admin/pricing/page.tsx sem mudar
 * comportamento. O JSX já era componentizado; aqui sai a lógica que sobrava na página.
 */
export function usePricingEditor() {
  const [catalog, setCatalog] = useState<PricingCatalog | null>(null);
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [limitCheck, setLimitCheck] = useState<CasesLimitCheck | null>(null);
  const [status, setStatus] = useState<PricingStatus>("loading");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const { message, setMessage } = useToast();

  // Form state
  const [casesLimit, setCasesLimit] = useState<number | null>(null);
  const [unlimitedCases, setUnlimitedCases] = useState(true);
  const [moduleOverrides, setModuleOverrides] = useState<
    Record<string, number | null>
  >({});
  const [installmentConfig, setInstallmentConfig] =
    useState<InstallmentConfig | null>(null);
  const [paymentMode, setPaymentMode] = useState("mock");
  const [notes, setNotes] = useState("");

  // Prévia (F) — reflete a configuração SALVA no servidor para um produto.
  const [previewProduct, setPreviewProduct] = useState("");
  const [previewEstimate, setPreviewEstimate] = useState<PricingEstimate | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const lastPreviewProduct = useRef<string>("");
  // Módulo em edição de preço (padrão de "clicar para editar").
  const [editingModule, setEditingModule] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setStatus("loading");
    setLoadErr(null);
    try {
      const [cat, cfg, lim] = await Promise.all([
        getPricingCatalog(),
        getPricingConfig(),
        checkCasesLimit(),
      ]);
      setCatalog(cat);
      setConfig(cfg);
      setLimitCheck(lim);

      const unlimited = cfg.cases_limit === null;
      setUnlimitedCases(unlimited);
      setCasesLimit(unlimited ? null : cfg.cases_limit);

      setModuleOverrides(
        Object.fromEntries(
          Object.entries(cfg.module_overrides).map(([k, v]) => [k, v.price_cents])
        )
      );

      setInstallmentConfig(normalizeInstallmentConfig(cfg.installment_config));

      // Produto padrão da prévia; o estimate é buscado pelo efeito dedicado
      // (que também revalida payment_mode e reage ao salvar / troca de produto).
      setPreviewProduct(cat.products[0]?.code ?? "analise_contratual");

      setNotes(cfg.notes ?? "");
      setStatus("idle");
    } catch (err) {
      setLoadErr(
        errorMessage(
          err,
          "API local indisponível. Verifique se o backend e o PostgreSQL estão rodando e se você está logado."
        )
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // defer (setTimeout 0) evita cascade render sincrono dentro do efeito
    const t = window.setTimeout(() => void loadAll(), 0);
    return () => window.clearTimeout(t);
  }, [loadAll]);

  // Prévia: busca o estimate da config SALVA. Reage à troca de produto e à
  // versão do config (após salvar). payment_mode só é exposto aqui — falha não
  // bloqueia a tela e mantém o aviso conservador de simulação (seam mock).
  const configVersion = config?.version;
  useEffect(() => {
    if (!previewProduct) return;
    let cancelled = false;
    // defer (setTimeout 0): mantém os setState fora do corpo síncrono do efeito
    // (evita cascade render — mesmo padrão do loadAll/Header).
    const t = window.setTimeout(() => {
      // Troca de produto: zera o estimate para exibir skeleton (evita mostrar os
      // números do produto anterior). Refetch por versão (após salvar) não pisca.
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

  const hasChanges = useMemo(() => {
    if (!config) return false;
    const initialUnlimited = config.cases_limit === null;
    if (initialUnlimited !== unlimitedCases) return true;
    if (!unlimitedCases && casesLimit !== config.cases_limit) return true;

    const initialModules = Object.fromEntries(
      Object.entries(config.module_overrides).map(([k, v]) => [k, v.price_cents])
    );

    if (notes.trim() !== (config.notes ?? "").trim()) return true;

    const allModuleKeys = new Set([
      ...Object.keys(initialModules),
      ...Object.keys(moduleOverrides),
    ]);
    for (const key of allModuleKeys) {
      if ((initialModules[key] ?? null) !== (moduleOverrides[key] ?? null)) return true;
    }

    if (installmentConfig) {
      const baseline = normalizeInstallmentConfig(config.installment_config);
      if (JSON.stringify(installmentConfig) !== JSON.stringify(baseline)) {
        return true;
      }
    }

    return false;
  }, [config, unlimitedCases, casesLimit, moduleOverrides, installmentConfig, notes]);

  // Validações de pagabilidade (P-1/P-2) — derivadas do estado do formulário.
  const enabledMethods = useMemo(
    () =>
      installmentConfig
        ? METHOD_ORDER.filter((k) => installmentConfig.allowed_methods[k]?.enabled)
        : [],
    [installmentConfig]
  );
  // P-1: nenhum método habilitado => casos ficariam sem forma de pagamento.
  const noMethodEnabled = installmentConfig !== null && enabledMethods.length === 0;
  // P-2: parcelamento ligado mas cartão desligado => nenhuma parcela é ofertada.
  const installmentsWithoutCard =
    !!installmentConfig?.enabled &&
    !installmentConfig.allowed_methods.cartao?.enabled;

  // "Definir nº" exige um inteiro >= 1. Campo vazio/inválido NÃO pode salvar
  // silenciosamente como ilimitado (bug: o cases_limit sumia sem o admin perceber).
  const casesLimitInvalid =
    !unlimitedCases &&
    (casesLimit === null || !Number.isInteger(casesLimit) || casesLimit < 1);

  const handleReset = () => {
    if (!config) return;
    setEditingModule(null);
    const unlimited = config.cases_limit === null;
    setUnlimitedCases(unlimited);
    setCasesLimit(unlimited ? null : config.cases_limit);
    setModuleOverrides(
      Object.fromEntries(
        Object.entries(config.module_overrides).map(([k, v]) => [k, v.price_cents])
      )
    );
    setInstallmentConfig(normalizeInstallmentConfig(config.installment_config));
    setNotes(config.notes ?? "");
  };

  const handleSave = async () => {
    if (casesLimitInvalid) {
      setMessage({
        text: 'Defina um limite de casos válido (inteiro ≥ 1) ou selecione "Ilimitado".',
        type: "error",
      });
      return;
    }
    setStatus("saving");
    setMessage(null);
    try {
      const payload: UpdatePricingConfigPayload = {
        cases_limit: unlimitedCases ? null : casesLimit ?? null,
      };

      const modOv: Record<string, { price_cents: number }> = {};
      for (const [code, cents] of Object.entries(moduleOverrides)) {
        if (cents !== null && !Number.isNaN(cents) && cents >= 0) {
          modOv[code] = { price_cents: cents };
        }
      }
      payload.module_overrides = modOv;

      if (installmentConfig) {
        payload.installment_config = installmentConfig;
      }

      payload.notes = notes.trim() || null;

      const updated = await updatePricingConfig(payload);
      setConfig(updated);
      setInstallmentConfig(normalizeInstallmentConfig(updated.installment_config));
      setMessage({
        text: `Configuração salva (versão ${updated.version}).`,
        type: "success",
      });
      setStatus("idle");

      // Atualização do limite pós-save é best-effort: uma falha AQUI não pode rebaixar o
      // sucesso do save (senão o admin acha que falhou, repete o PUT e bumpa a versão de novo).
      try {
        const lim = await checkCasesLimit();
        setLimitCheck(lim);
      } catch {
        // silencioso: o save já foi confirmado acima (mensagem de sucesso + status idle).
      }
    } catch (err) {
      setMessage({
        text: errorMessage(err, "Erro ao salvar."),
        type: "error",
      });
      setStatus("error");
    }
  };

  const isLoading = status === "loading";
  const isSaving = status === "saving";
  const canSave = hasChanges && !noMethodEnabled && !casesLimitInvalid;

  return {
    catalog,
    config,
    limitCheck,
    status,
    loadErr,
    message,
    setMessage,
    casesLimit,
    setCasesLimit,
    unlimitedCases,
    setUnlimitedCases,
    moduleOverrides,
    setModuleOverrides,
    installmentConfig,
    setInstallmentConfig,
    paymentMode,
    notes,
    setNotes,
    previewProduct,
    setPreviewProduct,
    previewEstimate,
    previewLoading,
    previewError,
    editingModule,
    setEditingModule,
    loadAll,
    hasChanges,
    noMethodEnabled,
    installmentsWithoutCard,
    casesLimitInvalid,
    handleReset,
    handleSave,
    isLoading,
    isSaving,
    canSave
  };
}
