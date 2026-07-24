"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AuthGuard } from "@/components/AuthGuard";
import { AdminGuard } from "@/components/AdminGuard";
import { AppLayout } from "@/components/AppLayout";
import { PageTitle } from "@/components/PageTitle";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Notification } from "@/components/Notification";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { InstallmentConfigCard } from "@/components/pricing/InstallmentConfigCard";
import { PricingPreview } from "@/components/pricing/PricingPreview";
import { PricingStatusBar } from "@/components/pricing/PricingStatusBar";
import { PricingLimitCard } from "@/components/pricing/PricingLimitCard";
import { PricingModulesEditor } from "@/components/pricing/PricingModulesEditor";
import { usePricingEditor } from "@/lib/usePricingEditor";
import { PRICING_SECTIONS, usePricingScrollSpy } from "@/lib/usePricingScrollSpy";

export default function AdminPricingPage() {
  const router = useRouter();

  const {
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
  } = usePricingEditor();

  const { activeSection, barRef, goToSection } = usePricingScrollSpy(status);

  return (
    <AuthGuard>
      <AdminGuard>
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
                sections={PRICING_SECTIONS}
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
                  {casesLimitInvalid && (
                    <Notification tone="error" title="Defina o limite de casos">
                      Você escolheu “Definir nº”, mas o campo está vazio ou inválido. Informe um
                      número inteiro maior ou igual a 1 — ou volte para “Ilimitado”. Não é
                      possível salvar nesta condição.
                    </Notification>
                  )}

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
      </AdminGuard>
    </AuthGuard>
  );
}
