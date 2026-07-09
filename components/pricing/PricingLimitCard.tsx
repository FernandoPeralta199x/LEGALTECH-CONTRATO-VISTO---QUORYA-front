"use client";

import { Shield } from "lucide-react";

type PricingLimitCardProps = {
  unlimitedCases: boolean;
  casesLimit: number | null;
  onUnlimitedChange: (value: boolean) => void;
  onCasesLimitChange: (value: number | null) => void;
};

/**
 * Editor do LIMITE de casos (seção sec-limite) do /admin/pricing. PRESENTACIONAL,
 * extraído do god-file: o estado (unlimitedCases/casesLimit) e sua persistência
 * seguem no pai; este card só EXIBE o toggle segmentado e o input, disparando os
 * callbacks recebidos por props. A validação inline do número (parse + clamp
 * 1..100000) é apresentação do input e permanece idêntica ao original.
 */
export function PricingLimitCard({
  unlimitedCases,
  casesLimit,
  onUnlimitedChange,
  onCasesLimitChange,
}: PricingLimitCardProps) {
  return (
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
              onClick={() => onUnlimitedChange(true)}
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
              onClick={() => onUnlimitedChange(false)}
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
                  onCasesLimitChange(null);
                  return;
                }
                const n = parseInt(v, 10);
                if (Number.isNaN(n)) return;
                onCasesLimitChange(Math.min(100000, Math.max(1, n)));
              }}
              placeholder="Ex: 100"
              aria-label="Quantidade máxima de casos ativos"
              className="h-11 w-24 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 text-sm tabular-nums text-[var(--text)] outline-none focus:border-[var(--teal)]"
            />
          )}
        </div>
      </div>
    </section>
  );
}
