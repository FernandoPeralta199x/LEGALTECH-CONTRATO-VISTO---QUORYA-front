import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { centsToReaisLabel } from "@/components/CurrencyInput";
import { cn } from "@/lib/cn";

export type KpiTone = "teal" | "orange" | "danger" | "blue";
export type KpiState = "ready" | "loading" | "empty";

const TONE_ICON: Record<KpiTone, string> = {
  teal: "border-[rgba(32,201,151,0.22)] bg-[var(--teal-dim)] text-[var(--teal)]",
  orange: "border-[rgba(249,115,22,0.22)] bg-[var(--orange-dim)] text-[var(--orange)]",
  danger: "border-[rgba(248,113,113,0.22)] bg-[var(--danger-dim)] text-[var(--danger)]",
  blue: "border-[rgba(96,165,250,0.22)] bg-[var(--blue-dim)] text-[var(--blue)]"
};

const TONE_VALUE: Record<KpiTone, string> = {
  teal: "text-[var(--teal)]",
  orange: "text-[var(--orange)]",
  danger: "text-[var(--danger)]",
  blue: "text-[var(--blue)]"
};

export type KpiCardProps = {
  label: string;
  icon: LucideIcon;
  tone: KpiTone;
  format: "currency" | "integer";
  /** Valor em centavos (format="currency"). */
  valueCents?: number | null;
  /** Valor inteiro (format="integer"). */
  valueNumber?: number | null;
  /** Variação percentual vs. período anterior (ex.: 12.5). */
  deltaPercent?: number | null;
  /** Para KPIs onde "subir é ruim" (atraso, reembolso): inverte a cor do delta. */
  invertDelta?: boolean;
  hint?: string;
  state?: KpiState;
  /** Atraso da animação de entrada (stagger). */
  index?: number;
};

function DeltaBadge({
  deltaPercent,
  invertDelta
}: {
  deltaPercent: number;
  invertDelta?: boolean;
}) {
  const up = deltaPercent >= 0;
  const good = invertDelta ? !up : up;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "mt-1 inline-flex items-center gap-1 text-[11px] font-medium tabular-nums",
        good ? "text-[var(--ok)]" : "text-[var(--danger)]"
      )}
    >
      <Arrow aria-hidden="true" size={12} />
      {Math.abs(deltaPercent).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
      <span className="text-[var(--text3)]">vs. período anterior</span>
    </span>
  );
}

/** Card de KPI executivo. Estado vazio é honesto ("R$ —"/"—", neutro); loading é
 *  skeleton; ready exibe valor na cor do tom + delta opcional. O layout nunca
 *  colapsa entre estados. */
export function KpiCard({
  label,
  icon: Icon,
  tone,
  format,
  valueCents,
  valueNumber,
  deltaPercent,
  invertDelta,
  hint,
  state = "empty",
  index = 0
}: KpiCardProps) {
  return (
    <div
      aria-busy={state === "loading" || undefined}
      className="cv-card animate-in p-5"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[var(--text2)]">{label}</p>

          {state === "loading" ? (
            <div className="skeleton mt-3 h-7 w-28" />
          ) : (
            <p
              className={cn(
                "mt-3 font-mono text-2xl font-bold tracking-tight tabular-nums",
                state === "empty" ? "text-[var(--text2)]" : TONE_VALUE[tone]
              )}
            >
              {state === "empty"
                ? format === "currency"
                  ? centsToReaisLabel(null)
                  : "—"
                : format === "currency"
                  ? centsToReaisLabel(valueCents ?? null)
                  : valueNumber === null || valueNumber === undefined
                    ? "—"
                    : valueNumber.toLocaleString("pt-BR")}
            </p>
          )}

          {state === "ready" &&
            deltaPercent !== null &&
            deltaPercent !== undefined && (
              <DeltaBadge deltaPercent={deltaPercent} invertDelta={invertDelta} />
            )}

          {hint && (
            <p className="mt-1 text-[11px] leading-4 text-[var(--text3)]">{hint}</p>
          )}
        </div>

        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
            TONE_ICON[tone]
          )}
        >
          <Icon aria-hidden="true" size={18} />
        </span>
      </div>
    </div>
  );
}
