import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/* ── Gráficos financeiros em SVG/CSS puro — SEM dependência externa. ───────────
 * Cores vêm dos tokens do design system. Todo gráfico é role="img" + aria-label,
 * e o dado bruto deve também existir em tabela/lista adjacente (não depender só
 * da cor). Em fases sem backend, use ChartCard com empty — nenhum dado é forjado. */

export type ChartTone = "teal" | "orange" | "blue" | "danger";

const TONE_STROKE: Record<ChartTone, string> = {
  teal: "var(--teal)",
  orange: "var(--orange)",
  blue: "var(--blue)",
  danger: "var(--danger)"
};

/** Moldura de gráfico: card com título e ou o gráfico, ou um estado vazio honesto
 *  (eixos tracejados + "sem dados"), nunca dados inventados. */
export function ChartCard({
  title,
  description,
  empty,
  emptyLabel = "Sem dados no período",
  children,
  className
}: {
  title: string;
  description?: string;
  empty?: boolean;
  emptyLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("cv-card p-5", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--text2)]">{description}</p>
        )}
      </div>
      {empty ? <EmptyChartFrame label={emptyLabel} /> : children}
    </section>
  );
}

function EmptyChartFrame({ label }: { label: string }) {
  return (
    <div className="relative">
      <svg
        aria-hidden="true"
        className="h-40 w-full"
        preserveAspectRatio="none"
        viewBox="0 0 300 140"
      >
        {[28, 56, 84, 112].map((y) => (
          <line
            key={y}
            stroke="var(--bd)"
            strokeDasharray="3 5"
            vectorEffect="non-scaling-stroke"
            x1="8"
            x2="292"
            y1={y}
            y2={y}
          />
        ))}
        <line stroke="var(--bd2)" vectorEffect="non-scaling-stroke" x1="8" x2="8" y1="12" y2="128" />
        <line stroke="var(--bd2)" vectorEffect="non-scaling-stroke" x1="8" x2="292" y1="128" y2="128" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-md border border-[var(--bd)] bg-[var(--surf)] px-3 py-1 text-[11px] font-medium text-[var(--text3)]">
          {label}
        </span>
      </div>
    </div>
  );
}

/** Barras verticais. data já ordenada; valores >= 0. */
export function MiniBars({
  data,
  tone = "teal",
  ariaLabel
}: {
  data: { label: string; value: number }[];
  tone?: ChartTone;
  ariaLabel: string;
}) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / (data.length * 1.6);
  const gap = barW * 0.6;

  return (
    <div>
      <svg aria-label={ariaLabel} className="h-40 w-full" role="img" viewBox="0 0 100 44">
        {data.map((d, i) => {
          const h = (d.value / max) * 34;
          const x = i * (barW + gap) + gap;
          return (
            <rect
              fill={TONE_STROKE[tone]}
              height={Math.max(0.5, h)}
              key={d.label}
              opacity={0.85}
              rx={1}
              width={barW}
              x={x}
              y={38 - h}
            />
          );
        })}
        <line stroke="var(--bd2)" strokeWidth={0.4} x1="0" x2="100" y1="38" y2="38" />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-[var(--text3)]">
        {data.map((d) => (
          <span className="font-mono" key={d.label}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Donut com rótulo central. */
export function MiniDonut({
  segments,
  centerLabel,
  ariaLabel
}: {
  segments: { label: string; value: number; tone: ChartTone }[];
  centerLabel?: string;
  ariaLabel: string;
}) {
  const total = Math.max(1, segments.reduce((sum, s) => sum + s.value, 0));
  const r = 15.915; // circunferência ≈ 100 → dasharray em %
  // Offset acumulado sem mutar variável de render (começa no topo, 25%).
  const arcs = segments.map((seg, i) => {
    const pct = (seg.value / total) * 100;
    const before = segments
      .slice(0, i)
      .reduce((sum, s) => sum + (s.value / total) * 100, 0);
    return { seg, pct, offset: 25 - before };
  });

  return (
    <div className="flex items-center gap-5">
      <svg aria-label={ariaLabel} className="h-28 w-28 shrink-0" role="img" viewBox="0 0 40 40">
        <circle cx="20" cy="20" fill="none" r={r} stroke="var(--surf3)" strokeWidth="5" />
        {arcs.map(({ seg, pct, offset }) => (
          // offset = 25 - before já posiciona o início no topo (12h); sem rotação extra.
          <circle
            cx="20"
            cy="20"
            fill="none"
            key={seg.label}
            r={r}
            stroke={TONE_STROKE[seg.tone]}
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeDashoffset={offset}
            strokeWidth="5"
          />
        ))}
        {centerLabel && (
          <text
            className="font-mono"
            dominantBaseline="central"
            fill="var(--text)"
            fontSize="5"
            fontWeight="700"
            textAnchor="middle"
            x="20"
            y="20"
          >
            {centerLabel}
          </text>
        )}
      </svg>
      <ul className="min-w-0 space-y-1.5">
        {segments.map((s) => (
          <li className="flex items-center gap-2 text-xs text-[var(--text2)]" key={s.label}>
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: TONE_STROKE[s.tone] }}
            />
            <span className="truncate">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barra horizontal empilhada (breakdown), em CSS puro. */
export function StackedBar({
  segments,
  ariaLabel
}: {
  segments: { label: string; value: number; tone: ChartTone }[];
  ariaLabel: string;
}) {
  const total = Math.max(1, segments.reduce((sum, s) => sum + s.value, 0));
  return (
    <div>
      <div
        aria-label={ariaLabel}
        className="flex h-3 w-full overflow-hidden rounded-[var(--r-pill)] bg-[var(--surf3)]"
        role="img"
      >
        {segments.map((s) => (
          <span
            key={s.label}
            style={{
              width: `${(s.value / total) * 100}%`,
              background: TONE_STROKE[s.tone]
            }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <li className="flex items-center gap-2 text-xs text-[var(--text2)]" key={s.label}>
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: TONE_STROKE[s.tone] }}
            />
            <span>{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
