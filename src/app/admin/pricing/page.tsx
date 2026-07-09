"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Notification } from "@/components/Notification";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import {
  InstallmentConfigCard,
  normalizeInstallmentConfig,
} from "@/components/pricing/InstallmentConfigCard";
import { PricingPreview } from "@/components/pricing/PricingPreview";
import { PricingStatusBar } from "@/components/pricing/PricingStatusBar";
import { PricingLimitCard } from "@/components/pricing/PricingLimitCard";
import { PricingModulesEditor } from "@/components/pricing/PricingModulesEditor";

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
              <PricingStatusBar
                barRef={barRef}
                limitCheck={limitCheck}
                config={config}
                hasChanges={hasChanges}
                isSaving={isSaving}
                canSave={canSave}
                noMethodEnabled={noMethodEnabled}
                onReset={handleReset}
                onSave={() => void handleSave()}
                sections={SECTIONS}
                activeSection={activeSection}
                onSectionClick={goToSection}
              />

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
                  <PricingLimitCard
                    unlimitedCases={unlimitedCases}
                    casesLimit={casesLimit}
                    onUnlimitedChange={setUnlimitedCases}
                    onCasesLimitChange={setCasesLimit}
                  />

                  {/* Preços de Módulos */}
                  {catalog && (
                    <PricingModulesEditor
                      catalog={catalog}
                      moduleOverrides={moduleOverrides}
                      onModuleOverridesChange={setModuleOverrides}
                      editingModule={editingModule}
                      onEditingModuleChange={setEditingModule}
                    />
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
                          Sem Pix, Boleto, Cartão de crédito ou Cartão de débito,
                          os casos ficam sem forma de pagamento. Habilite ao menos
                          um método
                          {!installmentConfig.enabled
                            ? " (ative o parcelamento para reexibir os métodos)"
                            : ""}
                          . Não é possível salvar nesta condição.
                        </Notification>
                      )}
                      {!noMethodEnabled && installmentsWithoutCard && (
                        <Notification tone="warning" title="Parcelamento sem cartão de crédito">
                          O parcelamento está habilitado, mas o Cartão de crédito está
                          desligado. Como só o cartão de crédito parcela, nenhuma opção
                          de parcelamento será ofertada — tudo à vista (1x).
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
