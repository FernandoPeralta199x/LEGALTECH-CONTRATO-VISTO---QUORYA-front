"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Settings,
  Layers,
  Shield,
  RotateCcw,
  Pencil,
  Check,
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
  InstallmentConfigCard,
  normalizeInstallmentConfig,
} from "@/components/pricing/InstallmentConfigCard";
import { PricingPreview } from "@/components/pricing/PricingPreview";

import {
  getPricingCatalog,
  getPricingConfig,
  updatePricingConfig,
  checkCasesLimit,
  estimatePricing,
  type PricingCatalog,
  type PricingConfig,
  type PricingEstimate,
  type CasesLimitCheck,
  type InstallmentConfig,
  type UpdatePricingConfigPayload,
} from "@/src/services/pricing";
import { errorMessage } from "@/src/lib/errorMessage";
import { METHOD_ORDER } from "@/lib/paymentMethods";

const TOAST_MS = 4000;

type Status = "idle" | "loading" | "saving" | "success" | "error";

// Seções do editor — usadas pelos atalhos da barra fixa e pelo scroll-spy.
// "Observações" é ancorada (sec-observacoes) mas NÃO entra aqui de propósito: não
// tem atalho (removido a pedido). No fim da página o scroll-spy mantém a última
// seção (Parcelamento) acesa ao rolar por Observações — comportamento coerente.
const SECTIONS = [
  { id: "sec-limite", label: "Limite" },
  { id: "sec-modulos", label: "Módulos" },
  { id: "sec-parcelamento", label: "Parcelamento" },
] as const;

// Altura do header fixo do app (h-16 = 64px). A linha do scroll-spy e o alvo do
// goToSection somam a altura REAL da barra fixa (barRef) a esta base — fonte única.
const HEADER_OFFSET = 64;

function jurosLabel(bps: number): string {
  return `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% a.m.`;
}

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
  const [installmentConfig, setInstallmentConfig] =
    useState<InstallmentConfig | null>(null);
  const [paymentMode, setPaymentMode] = useState("mock");
  const [notes, setNotes] = useState("");

  // Prévia (F) — reflete a configuração SALVA no servidor para um produto.
  const [previewProduct, setPreviewProduct] = useState("");
  const [previewEstimate, setPreviewEstimate] = useState<PricingEstimate | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Barra fixa (G) — seção ativa destacada nos atalhos.
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const barRef = useRef<HTMLDivElement>(null);
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

  // Scroll-spy dos atalhos: a seção ativa é a última cujo topo já passou abaixo
  // da barra fixa (linha = header + barra + folga). Determinístico e estável —
  // evita o "piscar" do IntersectionObserver com seções altas. rAF faz o throttle.
  useEffect(() => {
    // Só pula enquanto CARREGA (as seções ainda não estão no DOM). Antes gatilhava
    // em !idle && !saving, o que REMOVIA o listener após um save com erro e
    // congelava o destaque — agora o scroll-spy segue ativo em 'error' e 'saving'.
    if (status === "loading") return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = HEADER_OFFSET + (barRef.current?.offsetHeight ?? 0) + 24;
      let current: string = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      // Fim da página: a última seção pode ser curta demais para o topo cruzar a
      // linha — ao chegar ao fim, ativa a última mesmo assim. Só quando há rolagem
      // real (senão, com a página inteira visível, o topo já contaria como "fim").
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 4 && window.scrollY >= scrollable - 2) {
        current = SECTIONS[SECTIONS.length - 1].id;
      }
      setActiveSection(current);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update(); // estado correto no mount/re-anexo, sem depender de um evento de scroll
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [status]);

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

  const goToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Offset dinâmico: header do app (HEADER_OFFSET) + altura real da barra fixa +
    // folga. Acompanha a barra crescer/quebrar (mobile) — não depende de scroll-mt.
    const barH = barRef.current?.offsetHeight ?? 0;
    const y =
      el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET - barH - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };

  const isLoading = status === "loading";
  const isSaving = status === "saving";
  const canSave = hasChanges && !noMethodEnabled;

  return (
    <AuthGuard>
      <AppLayout>
        <div className="mx-auto max-w-6xl">
          {/* Header (título + descrição preservados) */}
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
              {/* ── Barra fixa (G): status + atalhos + salvar ────────────── */}
              <div
                ref={barRef}
                className="sticky top-16 z-20 -mx-1 mb-5 rounded-xl border border-[var(--bd)] bg-[var(--surf)] px-3 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.28)] sm:px-4"
                role="region"
                aria-label="Status e ações da configuração"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {/* Status (antiga aba "Status Atual", agora sempre visível) */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                      <Settings size={12} aria-hidden="true" />
                      Status
                    </span>
                    {limitCheck && (
                      <>
                        <span className="text-xs text-[var(--text2)]">
                          Casos ativos{" "}
                          <b className="font-mono font-semibold tabular-nums text-[var(--text)]">
                            {limitCheck.active_cases_count}
                          </b>
                        </span>
                        <span className="text-[var(--text3)]">·</span>
                        <span className="text-xs text-[var(--text2)]">
                          Limite{" "}
                          <b className="font-semibold tabular-nums text-[var(--text)]">
                            {limitCheck.cases_limit ?? "Ilimitado"}
                          </b>
                        </span>
                        <span className="text-[var(--text3)]">·</span>
                        <span className="text-xs text-[var(--text2)]">
                          Pode criar{" "}
                          <b
                            className="font-semibold"
                            style={{ color: limitCheck.allowed ? "var(--ok)" : "var(--danger)" }}
                          >
                            {limitCheck.allowed ? "Sim" : "Não"}
                          </b>
                        </span>
                      </>
                    )}
                    {config && (
                      <>
                        <span className="text-[var(--text3)]">·</span>
                        <span className="cv-badge cv-badge-muted px-2 py-0.5 font-mono">
                          v{config.version}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Ações (P-6: salvar sempre à mão) */}
                  <div className="ml-auto flex items-center gap-2">
                    {hasChanges && (
                      <Button
                        disabled={isSaving}
                        icon={<RotateCcw size={15} />}
                        onClick={handleReset}
                        size="sm"
                        title="Descartar alterações"
                        variant="secondary"
                      >
                        Descartar
                      </Button>
                    )}
                    <Button
                      disabled={!canSave}
                      icon={<Save size={15} />}
                      loading={isSaving}
                      onClick={() => void handleSave()}
                      size="sm"
                      title={
                        noMethodEnabled
                          ? "Habilite ao menos um método de pagamento para salvar."
                          : !hasChanges
                            ? "Nenhuma alteração para salvar."
                            : undefined
                      }
                    >
                      {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>

                  {/* Atalhos de seção */}
                  <div className="flex w-full items-center gap-1.5 overflow-x-auto border-t border-[var(--bd)] pt-2">
                    {SECTIONS.map((s) => {
                      const active = activeSection === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => goToSection(s.id)}
                          aria-current={active ? "true" : undefined}
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            active
                              ? "border-[rgba(32,201,151,0.4)] bg-[var(--teal-dim)] text-[var(--teal)]"
                              : "border-[var(--bd)] text-[var(--text2)] hover:border-[var(--bd2)] hover:text-[var(--text)]"
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Feedback de salvamento */}
              {message && (
                <Notification onDismiss={() => setMessage(null)} tone={message.type}>
                  {message.text}
                </Notification>
              )}

              {/* ── Editor (esq.) + Prévia (dir.) ────────────────────────── */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                {/* Coluna do editor */}
                <div className="min-w-0 space-y-5">
                  {/* Limite de Casos — linha compacta (toggle segmentado) */}
                  <section id="sec-limite" className="scroll-mt-44">
                    <div className="cv-card flex flex-wrap items-center gap-x-3 gap-y-3 p-4">
                      <Shield
                        size={18}
                        style={{ color: "var(--teal)" }}
                        className="shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--text)]">
                          Limite de casos
                        </div>
                        <div className="text-xs text-[var(--text2)]">
                          {unlimitedCases
                            ? "Ilimitado — sem restrição de casos ativos"
                            : `No máximo ${casesLimit ?? "—"} casos ativos`}
                        </div>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <div
                          className="flex overflow-hidden rounded-lg border border-[var(--bd2)] text-xs"
                          role="group"
                          aria-label="Modo do limite de casos"
                        >
                          <button
                            type="button"
                            aria-pressed={unlimitedCases}
                            onClick={() => setUnlimitedCases(true)}
                            className={`px-3 py-1.5 font-semibold transition-colors ${
                              unlimitedCases
                                ? "bg-[var(--teal)] text-[#04140f]"
                                : "text-[var(--text2)] hover:text-[var(--text)]"
                            }`}
                          >
                            Ilimitado
                          </button>
                          <button
                            type="button"
                            aria-pressed={!unlimitedCases}
                            onClick={() => setUnlimitedCases(false)}
                            className={`px-3 py-1.5 font-semibold transition-colors ${
                              !unlimitedCases
                                ? "bg-[var(--teal)] text-[#04140f]"
                                : "text-[var(--text2)] hover:text-[var(--text)]"
                            }`}
                          >
                            Definir nº
                          </button>
                        </div>
                        {!unlimitedCases && (
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
                            aria-label="Quantidade máxima de casos ativos"
                            className="h-11 w-24 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 text-sm tabular-nums text-[var(--text)] outline-none focus:border-[var(--teal)]"
                          />
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Preços de Módulos */}
                  {catalog && (
                    <section id="sec-modulos" className="scroll-mt-44">
                      <Card
                        title={
                          <span className="flex items-center gap-2">
                            <Layers size={18} style={{ color: "var(--teal)" }} />
                            Preços de Módulos
                          </span>
                        }
                        description="Deixe vazio para usar o padrão. Os preços dos produtos são calculados automaticamente a partir dos módulos obrigatórios."
                      >
                        <div className="space-y-2">
                          {catalog.modules.map((mod, index) => {
                            const overrideCents = moduleOverrides[mod.code] ?? null;
                            const hasOverride = overrideCents !== null;
                            const effectiveCents = overrideCents ?? mod.price_cents;
                            const isEditing = editingModule === mod.code;
                            return (
                              <div
                                key={mod.code}
                                // Motion: entrada escalonada das linhas de módulo.
                                className="animate-in flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-2.5"
                                style={{ animationDelay: `${index * 40}ms` }}
                              >
                                <div className="min-w-0 flex-1">
                                  <div
                                    className="text-sm font-medium"
                                    style={{ color: "var(--text)" }}
                                  >
                                    {mod.title}
                                  </div>
                                  <div className="mt-0.5 text-xs text-[var(--text2)]">
                                    {hasOverride ? (
                                      <>
                                        Padrão{" "}
                                        <span className="font-mono">
                                          {centsToReaisLabel(mod.price_cents)}
                                        </span>
                                      </>
                                    ) : (
                                      "Preço padrão do catálogo"
                                    )}
                                  </div>
                                </div>
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <CurrencyInput
                                      value={overrideCents}
                                      onChange={(cents) =>
                                        setModuleOverrides((prev) => ({
                                          ...prev,
                                          [mod.code]: cents,
                                        }))
                                      }
                                      placeholder={centsToReaisLabel(mod.price_cents)}
                                      className="w-36"
                                      aria-label={`Preço personalizado para ${mod.title}`}
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
                                        className="text-xs text-[var(--text2)] underline hover:text-[var(--text)]"
                                      >
                                        usar padrão
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setEditingModule(null)}
                                      className="cv-icon-btn"
                                      aria-label={`Concluir edição de ${mod.title}`}
                                    >
                                      <Check size={15} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-mono text-sm font-bold tabular-nums text-[var(--text)]">
                                      {centsToReaisLabel(effectiveCents)}
                                    </span>
                                    {hasOverride ? (
                                      <span className="rounded-full border border-[rgba(245,165,36,0.3)] bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                        personalizado
                                      </span>
                                    ) : (
                                      <span className="rounded-full border border-[var(--bd2)] bg-[var(--surf3)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text2)]">
                                        padrão
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setEditingModule(mod.code)}
                                      className="cv-icon-btn"
                                      aria-label={`Editar preço de ${mod.title}`}
                                    >
                                      <Pencil size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    </section>
                  )}

                  {/* Parcelamento + validações (P-1/P-2) */}
                  {installmentConfig && (
                    <section id="sec-parcelamento" className="scroll-mt-44 space-y-3">
                      <InstallmentConfigCard
                        onChange={setInstallmentConfig}
                        paymentMode={paymentMode}
                        value={installmentConfig}
                      />
                      {noMethodEnabled && (
                        <Notification tone="error" title="Nenhum método de pagamento habilitado">
                          Sem Pix, Boleto ou Cartão, os casos ficam sem forma de
                          pagamento. Habilite ao menos um método
                          {!installmentConfig.enabled
                            ? " (ative o parcelamento para reexibir os métodos)"
                            : ""}
                          . Não é possível salvar nesta condição.
                        </Notification>
                      )}
                      {!noMethodEnabled && installmentsWithoutCard && (
                        <Notification tone="warning" title="Parcelamento sem cartão">
                          O parcelamento está habilitado, mas o Cartão está desligado.
                          Como só o cartão parcela, nenhuma opção de parcelamento será
                          ofertada — tudo à vista (1x).
                        </Notification>
                      )}
                    </section>
                  )}

                  {/* Observações */}
                  <section id="sec-observacoes" className="scroll-mt-44">
                    <Card title="Observações">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Notas internas sobre a configuração de pricing..."
                        className="w-full resize-none rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--teal)]"
                      />
                      <div
                        className="mt-1 text-right text-xs"
                        style={{ color: "var(--text3)" }}
                      >
                        {notes.length}/500
                      </div>
                    </Card>
                  </section>
                </div>

                {/* Coluna da prévia (F) */}
                <PricingPreview
                  catalog={catalog}
                  hasChanges={hasChanges}
                  installmentConfig={installmentConfig}
                  onProductChange={setPreviewProduct}
                  previewError={previewError}
                  previewEstimate={previewEstimate}
                  previewLoading={previewLoading}
                  previewProduct={previewProduct}
                />
              </div>
            </>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
