import { CalendarRange } from "lucide-react";

import { cn } from "@/lib/cn";

export type PeriodKey =
  | "today"
  | "7d"
  | "month"
  | "lastMonth"
  | "year"
  | "custom";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "month", label: "Este mês" },
  { key: "lastMonth", label: "Mês passado" },
  { key: "year", label: "Este ano" },
  { key: "custom", label: "Personalizado" }
];

export function periodLabel(key: PeriodKey): string {
  return PERIODS.find((p) => p.key === key)?.label ?? "Este mês";
}

/** Seletor de período (controle transversal, não é aba). Pílulas segmentadas no
 *  padrão do PricingStatusBar. Controlado pelo pai — em fases sem backend, a
 *  seleção é real mas não há dados a filtrar (os painéis seguem vazios). */
export function PeriodFilter({
  value,
  onChange,
  className
}: {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  className?: string;
}) {
  return (
    <div
      aria-label="Período"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      role="group"
    >
      <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text3)]">
        <CalendarRange aria-hidden="true" size={13} />
        Período
      </span>
      {PERIODS.map((period) => {
        const active = period.key === value;
        return (
          <button
            aria-pressed={active}
            className={cn(
              "min-h-9 rounded-[var(--r-pill)] border px-3 py-1.5 text-[11px] font-medium transition-colors duration-fast",
              active
                ? "border-[rgba(32,201,151,0.4)] bg-[var(--teal-dim)] text-[var(--teal)]"
                : "border-[var(--bd)] text-[var(--text2)] hover:border-[var(--bd2)] hover:text-[var(--text)]"
            )}
            key={period.key}
            onClick={() => onChange(period.key)}
            type="button"
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
