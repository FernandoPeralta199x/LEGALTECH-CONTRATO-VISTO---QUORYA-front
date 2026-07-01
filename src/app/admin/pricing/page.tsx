"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Settings,
  Layers,
  Shield,
  RotateCcw,
} from "lucide-react";

import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { Card } from "@/components/Card";
import { CurrencyInput, centsToReaisLabel } from "@/components/CurrencyInput";
import { Button } from "@/components/Button";
import { Notification } from "@/components/Notification";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";

import {
  getPricingCatalog,
  getPricingConfig,
  updatePricingConfig,
  checkCasesLimit,
  type PricingCatalog,
  type PricingConfig,
  type CasesLimitCheck,
  type UpdatePricingConfigPayload,
} from "@/src/services/pricing";
import { errorMessage } from "@/src/lib/errorMessage";

const TOAST_MS = 4000;

type Status = "idle" | "loading" | "saving" | "success" | "error";

function useToast() {
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [message]);

  return { message, setMessage };
}

export default function AdminPricingPage() {
  const router = useRouter();

  const [catalog, setCatalog] = useState<PricingCatalog | null>(null);
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [limitCheck, setLimitCheck] = useState<CasesLimitCheck | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const { message, setMessage } = useToast();

  // Form state
  const [casesLimit, setCasesLimit] = useState<number | null>(null);
  const [unlimitedCases, setUnlimitedCases] = useState(true);
  const [moduleOverrides, setModuleOverrides] = useState<
    Record<string, number | null>
  >({});
  const [notes, setNotes] = useState("");

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

    return false;
  }, [config, unlimitedCases, casesLimit, moduleOverrides, notes]);

  const handleReset = () => {
    if (!config) return;
    const unlimited = config.cases_limit === null;
    setUnlimitedCases(unlimited);
    setCasesLimit(unlimited ? null : config.cases_limit);
    setModuleOverrides(
      Object.fromEntries(
        Object.entries(config.module_overrides).map(([k, v]) => [k, v.price_cents])
      )
    );
    setNotes(config.notes ?? "");
  };

  const handleSave = async () => {
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

      payload.notes = notes.trim() || null;

      const updated = await updatePricingConfig(payload);
      setConfig(updated);
      setMessage({
        text: `Configuração salva (versão ${updated.version}).`,
        type: "success",
      });
      setStatus("idle");

      const lim = await checkCasesLimit();
      setLimitCheck(lim);
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

  return (
    <AuthGuard>
      <AppLayout>
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              aria-label="Voltar para Administração"
              onClick={() => router.push("/admin")}
              className="cv-icon-btn"
              type="button"
            >
              <ArrowLeft size={18} />
            </button>
            <PageTitle
              title="Configuração de Pricing"
              description="Gerencie limites, preços e overrides por organização"
              eyebrow="Administração"
            />
          </div>

          {/* Feedback de salvamento (carregamento usa ErrorState abaixo) */}
          {message && (
            <Notification
              onDismiss={() => setMessage(null)}
              tone={message.type}
            >
              {message.text}
            </Notification>
          )}

          {isLoading ? (
            <LoadingState label="Carregando configuração de pricing..." />
          ) : status === "error" && !config ? (
            <ErrorState
              description="Não foi possível carregar a configuração de pricing."
              details={loadErr ?? undefined}
              action={<Button onClick={() => void loadAll()}>Tentar novamente</Button>}
            />
          ) : (
            <>
              {/* Cases Limit + Status */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card title="Limite de Casos">
                  <div className="mb-4 flex items-center gap-2">
                    <Shield size={18} style={{ color: "var(--accent)" }} />
                    <h3 className="font-semibold" style={{ color: "var(--text)" }}>
                      Limite de Casos
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={unlimitedCases}
                        onChange={(e) => setUnlimitedCases(e.target.checked)}
                        className="rounded border-[var(--bd)] bg-[var(--surf2)] text-[var(--accent)]"
                      />
                      <span style={{ color: "var(--text2)" }}>
                        Ilimitado (sem restrição)
                      </span>
                    </label>
                    {!unlimitedCases && (
                      <div className="space-y-1">
                        <label
                          className="text-xs"
                          style={{ color: "var(--text3)" }}
                        >
                          Quantidade máxima de casos ativos
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100000}
                          value={casesLimit ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              setCasesLimit(null);
                              return;
                            }
                            const n = parseInt(v, 10);
                            if (Number.isNaN(n)) return;
                            setCasesLimit(Math.min(100000, Math.max(1, n)));
                          }}
                          placeholder="Ex: 100"
                          className="w-full rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    )}
                  </div>
                </Card>

                <Card title="Status Atual">
                  <div className="mb-4 flex items-center gap-2">
                    <Settings size={18} style={{ color: "var(--accent)" }} />
                    <h3 className="font-semibold" style={{ color: "var(--text)" }}>
                      Status Atual
                    </h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    {limitCheck && (
                      <>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text2)" }}>Casos ativos</span>
                          <span style={{ color: "var(--text)" }}>
                            {limitCheck.active_cases_count}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text2)" }}>Limite</span>
                          <span style={{ color: "var(--text)" }}>
                            {limitCheck.cases_limit ?? "Ilimitado"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text2)" }}>Pode criar</span>
                          <span
                            style={{
                              color: limitCheck.allowed ? "#22c55e" : "#ef4444",
                            }}
                          >
                            {limitCheck.allowed ? "Sim" : "Não"}
                          </span>
                        </div>
                      </>
                    )}
                    {config && (
                      <div
                        className="mt-2 flex justify-between pt-2"
                        style={{ borderTop: "1px solid var(--bd)" }}
                      >
                        <span style={{ color: "var(--text2)" }}>Versão</span>
                        <span style={{ color: "var(--text)" }}>{config.version}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Module Overrides */}
              {catalog && (
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <Layers size={18} style={{ color: "var(--accent)" }} />
                      Preços de Módulos
                    </span>
                  }
                  description="Deixe vazio para usar o padrão. Os preços dos produtos são calculados automaticamente a partir dos módulos obrigatórios."
                >
                  <div className="space-y-3">
                    {catalog.modules.map((mod) => {
                      const overrideCents = moduleOverrides[mod.code] ?? null;
                      const hasOverride = overrideCents !== null;
                      return (
                        <div
                          key={mod.code}
                          className="flex flex-col gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] p-3 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-sm font-medium"
                              style={{ color: "var(--text)" }}
                            >
                              {mod.title}
                            </div>
                            <div
                              className="mt-0.5 flex items-center gap-2 text-xs"
                              style={{ color: "var(--text2)" }}
                            >
                              <span>Padrão: {centsToReaisLabel(mod.price_cents)}</span>
                              {hasOverride && (
                                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                                  override
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <CurrencyInput
                              value={overrideCents}
                              onChange={(cents) =>
                                setModuleOverrides((prev) => ({
                                  ...prev,
                                  [mod.code]: cents,
                                }))
                              }
                              placeholder={centsToReaisLabel(mod.price_cents)}
                              className="w-40"
                              aria-label={`Preço override para ${mod.title}`}
                            />
                            {hasOverride && (
                              <button
                                type="button"
                                onClick={() =>
                                  setModuleOverrides((prev) => ({
                                    ...prev,
                                    [mod.code]: null,
                                  }))
                                }
                                className="text-xs text-[var(--text3)] underline hover:text-[var(--text)]"
                              >
                                usar padrão
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Notes */}
              <Card title="Observações">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Notas internas sobre a configuração de pricing..."
                  className="w-full resize-none rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                />
                <div
                  className="mt-1 text-right text-xs"
                  style={{ color: "var(--text3)" }}
                >
                  {notes.length}/500
                </div>
              </Card>

              {/* Save */}
              <div className="flex items-center justify-end gap-3">
                {hasChanges && (
                  <Button
                    disabled={isSaving}
                    icon={<RotateCcw size={15} />}
                    onClick={handleReset}
                    variant="secondary"
                  >
                    Descartar alterações
                  </Button>
                )}
                <Button
                  disabled={!hasChanges}
                  icon={<Save size={16} />}
                  loading={isSaving}
                  onClick={() => void handleSave()}
                >
                  {isSaving ? "Salvando..." : "Salvar Configuração"}
                </Button>
              </div>
            </>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
