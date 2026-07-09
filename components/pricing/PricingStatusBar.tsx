"use client";

import type { RefObject } from "react";
import { RotateCcw, Save, Settings } from "lucide-react";

import { Button } from "@/components/Button";
import type { CasesLimitCheck, PricingConfig } from "@/src/services/pricing";

type PricingStatusBarProps = {
  barRef: RefObject<HTMLDivElement | null>;
  limitCheck: CasesLimitCheck | null;
  config: PricingConfig | null;
  hasChanges: boolean;
  isSaving: boolean;
  canSave: boolean;
  noMethodEnabled: boolean;
  onReset: () => void;
  onSave: () => void;
  sections: readonly { id: string; label: string }[];
  activeSection: string;
  onSectionClick: (id: string) => void;
};

/**
 * Barra fixa (G) do /admin/pricing: status atual + ações (descartar/salvar) +
 * atalhos de seção. PRESENTACIONAL, extraída do god-file: todo o estado, os
 * handlers (handleReset/handleSave/goToSection) e o scroll-spy seguem no pai;
 * a barra só EXIBE e dispara os callbacks recebidos por props. O `barRef` é do
 * pai (scroll-spy e goToSection leem sua altura) e é anexado ao container aqui.
 */
export function PricingStatusBar({
  barRef,
  limitCheck,
  config,
  hasChanges,
  isSaving,
  canSave,
  noMethodEnabled,
  onReset,
  onSave,
  sections,
  activeSection,
  onSectionClick,
}: PricingStatusBarProps) {
  return (
    <div
      ref={barRef}
      className="cv-glass-bar sticky top-16 z-20 -mx-1 mb-5 rounded-xl px-3 py-2.5 backdrop-blur-md backdrop-saturate-150 sm:px-4"
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
              onClick={onReset}
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
            onClick={onSave}
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
          {sections.map((s) => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSectionClick(s.id)}
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
  );
}
