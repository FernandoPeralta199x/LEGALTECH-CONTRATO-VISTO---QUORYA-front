"use client";

import { AlertTriangle, Eye, Wallet } from "lucide-react";

import { centsToReaisLabel } from "@/components/CurrencyInput";
import { SelectInput } from "@/components/FormField";
import { Notification } from "@/components/Notification";
import { METHOD_LABELS, METHOD_ORDER } from "@/lib/paymentMethods";
import type {
  InstallmentConfig,
  InstallmentOption,
  PricingCatalog,
  PricingEstimate,
} from "@/src/services/pricing";

type PricingPreviewProps = {
  catalog: PricingCatalog | null;
  previewProduct: string;
  onProductChange: (code: string) => void;
  previewLoading: boolean;
  previewError: string | null;
  previewEstimate: PricingEstimate | null;
  hasChanges: boolean;
  installmentConfig: InstallmentConfig | null;
};

/**
 * Coluna de Prévia (F) do /admin/pricing. PRESENTACIONAL, extraída do god-file:
 * o efeito de estimativa (estimatePricing) e todo o estado seguem no pai; a Prévia
 * só EXIBE a config salva (previewEstimate) e o rascunho ao vivo (installmentConfig).
 */
export function PricingPreview({
  catalog,
  previewProduct,
  onProductChange,
  previewLoading,
  previewError,
  previewEstimate,
  hasChanges,
  installmentConfig,
}: PricingPreviewProps) {
  return (
    <aside className="lg:sticky lg:top-44 lg:self-start">
      <div className="cv-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Eye size={16} style={{ color: "var(--teal)" }} />
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text)]">Prévia</h2>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-[var(--text3)]">
            Config. salva
          </span>
        </div>
        <p className="mb-3 text-xs leading-5 text-[var(--text2)]">
          Como as opções aparecem na tela de pagamento do caso.
        </p>

        {/* Seletor de produto */}
        {catalog && catalog.products.length > 0 && (
          <div className="mb-3">
            <label
              className="mb-1 block text-[11px] font-semibold text-[var(--text2)]"
              htmlFor="preview-produto"
            >
              Produto de referência
            </label>
            <SelectInput
              id="preview-produto"
              value={previewProduct}
              onChange={(e) => onProductChange(e.target.value)}
            >
              {catalog.products.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.title}
                </option>
              ))}
            </SelectInput>
          </div>
        )}

        {previewLoading && !previewEstimate ? (
          <div className="space-y-2">
            <div className="skeleton h-14 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : previewError ? (
          <Notification compact tone="info">
            {previewError} Verifique o backend/login; a edição continua
            funcionando normalmente.
          </Notification>
        ) : previewEstimate ? (
          <div className="space-y-3">
            {/* Total */}
            <div className="flex items-center gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(32,201,151,0.22)] bg-[var(--teal-dim)] text-[var(--teal)]">
                <Wallet size={15} />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text2)]">
                  Total do pedido
                  <span className="rounded-full border border-[rgba(32,201,151,0.3)] bg-[var(--teal-dim)] px-1.5 py-px text-[8px] font-bold text-[var(--teal)]">
                    salvo
                  </span>
                </p>
                <p className="font-mono text-base font-bold tabular-nums text-[var(--text)]">
                  {centsToReaisLabel(previewEstimate.total_price_cents)}
                </p>
                {previewEstimate.modules_total_cents > 0 && (
                  <p className="font-mono text-[10px] tabular-nums text-[var(--text2)]">
                    base {centsToReaisLabel(previewEstimate.base_price_cents)} +
                    módulos{" "}
                    {centsToReaisLabel(previewEstimate.modules_total_cents)}
                  </p>
                )}
              </div>
            </div>

            {/* Opções de parcelamento — à vista destacado + grade compacta.
                    "total" só aparece quando há juros (senão total = base). */}
            {previewEstimate.installment_options.length > 0 ? (
              (() => {
                const opts = previewEstimate.installment_options;
                const avista = opts.find((o) => o.parcelas === 1);
                const parceladas = opts.filter((o) => o.parcelas > 1);
                const methodNames = (ms: string[]) =>
                  ms
                    .map(
                      (m) =>
                        METHOD_LABELS[m as (typeof METHOD_ORDER)[number]] ?? m,
                    )
                    .join(" · ");
                return (
                  <div className="space-y-3">
                    {avista && (
                      <div>
                        <p className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-[var(--text2)]">
                          À vista
                        </p>
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-[rgba(32,201,151,0.3)] bg-[var(--teal-dim)] px-3 py-2">
                          <span className="font-mono text-xs font-bold tabular-nums text-[var(--text)]">
                            1x · {centsToReaisLabel(avista.valor_parcela_cents)}
                          </span>
                          {avista.allowed_methods.length > 0 && (
                            <span className="text-[10px] font-medium text-[var(--teal)]">
                              {methodNames(avista.allowed_methods)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {parceladas.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-[var(--text2)]">
                          Parcelado no cartão
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {parceladas.map((opt: InstallmentOption, index) => (
                            <div
                              key={opt.parcelas}
                              // Motion: entrada escalonada das opções de parcela.
                              className="animate-in rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-2 py-1.5 text-center"
                              style={{ animationDelay: `${index * 40}ms` }}
                            >
                              <div className="font-mono text-[10px] text-[var(--text2)]">
                                {opt.parcelas}x
                              </div>
                              <div className="font-mono text-[11px] font-bold tabular-nums text-[var(--text)]">
                                {centsToReaisLabel(opt.valor_parcela_cents)}
                              </div>
                              {opt.has_juros && (
                                <div className="font-mono text-[8px] font-medium tabular-nums text-amber-400">
                                  +{centsToReaisLabel(opt.acrescimo_cents)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <p className="text-xs text-[var(--text2)]">
                Nenhuma opção de parcelamento para este produto.
              </p>
            )}

            {hasChanges && (
              <p className="flex items-start gap-1.5 text-[11px] leading-4 text-[var(--text2)]">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                Alterações não salvas. A prévia atualiza após salvar.
              </p>
            )}
          </div>
        ) : null}

        {/* Rascunho ao vivo (reflete o formulário) — painel distinto
                do bloco "Config. salva" acima, para não confundir. */}
        {installmentConfig && (
          <div className="mt-4 rounded-lg border border-[var(--bd2)] bg-[var(--surf2)] p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text)]">
              <span
                className="inline-block h-2 w-2 rounded-full bg-[var(--orange)]"
                aria-hidden="true"
              />
              Rascunho — não salvo
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text2)]">Parcelamento</span>
                <span
                  className="font-medium"
                  style={{
                    color: installmentConfig.enabled
                      ? "var(--teal)"
                      : "var(--text3)",
                  }}
                >
                  {installmentConfig.enabled
                    ? `até ${installmentConfig.max_parcelas}x`
                    : "à vista (1x)"}
                </span>
              </div>
              {METHOD_ORDER.map((key, index) => {
                const rule = installmentConfig.allowed_methods[key];
                const on = !!rule?.enabled;
                return (
                  <div
                    key={key}
                    // Motion: entrada escalonada das linhas de método (rascunho).
                    className="animate-in flex items-center justify-between text-[11px]"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <span className="text-[var(--text2)]">
                      {METHOD_LABELS[key]}
                    </span>
                    <span
                      className="font-medium tabular-nums"
                      style={{ color: on ? "var(--text)" : "var(--text3)" }}
                    >
                      {on
                        ? key === "cartao"
                          ? `até ${rule?.max_parcelas ?? 1}x`
                          : "à vista"
                        : "desligado"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
