"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

/** Controle segmentado (pílulas) reutilizável, no visual do PeriodFilter.
 *  role="group" + aria-pressed (não é um tablist — a página já tem um). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; icon?: LucideIcon }[];
  ariaLabel: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="inline-flex flex-wrap items-center gap-1.5"
      role="group"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.id === value;
        return (
          <button
            aria-pressed={active}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-[var(--r-pill)] border px-3.5 py-1.5 text-xs font-medium transition-colors duration-fast",
              active
                ? "border-[rgba(32,201,151,0.4)] bg-[var(--teal-dim)] text-[var(--teal)]"
                : "border-[var(--bd)] text-[var(--text2)] hover:border-[var(--bd2)] hover:text-[var(--text)]"
            )}
            key={opt.id}
            onClick={() => onChange(opt.id)}
            type="button"
          >
            {Icon && <Icon aria-hidden="true" size={14} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
