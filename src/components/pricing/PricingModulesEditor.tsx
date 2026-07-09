"use client";

import type { Dispatch, SetStateAction } from "react";
import { Check, Layers, Pencil } from "lucide-react";

import { Card } from "@/components/Card";
import { CurrencyInput, centsToReaisLabel } from "@/components/CurrencyInput";
import type { PricingCatalog } from "@/services/pricing";

type PricingModulesEditorProps = {
  catalog: PricingCatalog;
  moduleOverrides: Record<string, number | null>;
  onModuleOverridesChange: Dispatch<SetStateAction<Record<string, number | null>>>;
  editingModule: string | null;
  onEditingModuleChange: (value: string | null) => void;
};

/**
 * Editor de OVERRIDES de preço por módulo (seção sec-modulos) do /admin/pricing.
 * PRESENTACIONAL, extraído do god-file: o estado (moduleOverrides/editingModule)
 * e a persistência seguem no pai; este grid só EXIBE cada módulo e dispara os
 * setters recebidos por props. `onModuleOverridesChange` é o próprio dispatch do
 * pai — os updaters funcionais (prev => …) são preservados sem mudança.
 */
export function PricingModulesEditor({
  catalog,
  moduleOverrides,
  onModuleOverridesChange,
  editingModule,
  onEditingModuleChange,
}: PricingModulesEditorProps) {
  return (
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
                        onModuleOverridesChange((prev) => ({
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
                          onModuleOverridesChange((prev) => ({
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
                      onClick={() => onEditingModuleChange(null)}
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
                      onClick={() => onEditingModuleChange(mod.code)}
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
  );
}
