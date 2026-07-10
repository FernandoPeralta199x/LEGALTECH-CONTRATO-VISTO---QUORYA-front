"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getPricingCatalog,
  getPricingConfig,
  updatePricingConfig,
  checkCasesLimit,
  type PricingCatalog,
  type PricingConfig,
  type CasesLimitCheck,
  type InstallmentConfig,
  type UpdatePricingConfigPayload
} from "@/services/pricing";
import { errorMessage } from "@/lib/errorMessage";
import { METHOD_ORDER } from "@/lib/paymentMethods";
import { normalizeInstallmentConfig } from "@/components/pricing/InstallmentConfigCard";
import type { ToastMessage } from "@/lib/useToast";

export type PricingFormStatus = "idle" | "loading" | "saving" | "success" | "error";

/** Formulário de configuração de pricing: carga (catálogo+config+limite), estado do form,
 *  dirty-check, validações de pagabilidade (P-1/P-2), reset e save. É o PORTADOR do contrato
 *  monetário — monta o payload do PUT em centavos INTEIROS (module_overrides.price_cents,
 *  installment_config) e faz a dirty-check via JSON.stringify da baseline normalizada.
 *  Extraído de admin/pricing (fe-struct-02).
 *
 *  `setMessage` é injetado (o useToast permanece na página) para o handleSave emitir o
 *  feedback de sucesso/erro sem instanciar um segundo toast. NÃO altera rota, payload
 *  (UpdatePricingConfigPayload), enum de método nem representação monetária. */
export function usePricingConfigForm(options: {
  setMessage: (message: ToastMessage | null) => void;
}) {
  const { setMessage } = options;

  const [catalog, setCatalog] = useState<PricingCatalog | null>(null);
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [limitCheck, setLimitCheck] = useState<CasesLimitCheck | null>(null);
  const [status, setStatus] = useState<PricingFormStatus>("loading");
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Form state
  const [casesLimit, setCasesLimit] = useState<number | null>(null);
  const [unlimitedCases, setUnlimitedCases] = useState(true);
  const [moduleOverrides, setModuleOverrides] = useState<
    Record<string, number | null>
  >({});
  const [installmentConfig, setInstallmentConfig] =
    useState<InstallmentConfig | null>(null);
  const [notes, setNotes] = useState("");
  // Módulo em edição de preço (padrão de "clicar para editar").
  const [editingModule, setEditingModule] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setStatus("loading");
    setLoadErr(null);
    try {
      const [cat, cfg, lim] = await Promise.all([
        getPricingCatalog(),
        getPricingConfig(),
        checkCasesLimit()
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

      // O produto inicial da prévia é semeado por usePricingPreview a partir do catálogo.
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
    // defer (setTimeout 0) evita cascade render síncrono dentro do efeito
    const t = window.setTimeout(() => void loadAll(), 0);
    return () => window.clearTimeout(t);
  }, [loadAll]);

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
      ...Object.keys(moduleOverrides)
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
    setStatus("saving");
    setMessage(null);
    try {
      const payload: UpdatePricingConfigPayload = {
        cases_limit: unlimitedCases ? null : casesLimit ?? null
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
        type: "success"
      });
      setStatus("idle");

      const lim = await checkCasesLimit();
      setLimitCheck(lim);
    } catch (err) {
      setMessage({
        text: errorMessage(err, "Erro ao salvar."),
        type: "error"
      });
      setStatus("error");
    }
  };

  const isLoading = status === "loading";
  const isSaving = status === "saving";
  const canSave = hasChanges && !noMethodEnabled;

  return {
    catalog,
    config,
    limitCheck,
    status,
    loadErr,
    casesLimit,
    setCasesLimit,
    unlimitedCases,
    setUnlimitedCases,
    moduleOverrides,
    setModuleOverrides,
    installmentConfig,
    setInstallmentConfig,
    notes,
    setNotes,
    editingModule,
    setEditingModule,
    hasChanges,
    noMethodEnabled,
    installmentsWithoutCard,
    canSave,
    isLoading,
    isSaving,
    loadAll,
    handleReset,
    handleSave
  };
}
