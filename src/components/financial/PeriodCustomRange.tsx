"use client";

/** Inputs de data do período Personalizado. `type="date"` nativo já devolve
 *  YYYY-MM-DD (o formato que o backend espera) e traz calendário + min/max grátis,
 *  sem dependência. min/max cruzados impedem 'de' > 'até' na própria UI. */
export function PeriodCustomRange({
  from,
  to,
  onFromChange,
  onToChange,
  invalid
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  invalid: boolean;
}) {
  return (
    <div aria-label="Intervalo personalizado" className="flex flex-wrap items-center gap-2" role="group">
      <label className="flex items-center gap-1.5 text-[11px] text-[var(--text3)]">
        De
        <input
          aria-label="Data inicial"
          className="cv-input h-9 px-2 py-1 text-[12px]"
          max={to || undefined}
          onChange={(e) => onFromChange(e.target.value)}
          type="date"
          value={from}
        />
      </label>
      <label className="flex items-center gap-1.5 text-[11px] text-[var(--text3)]">
        até
        <input
          aria-label="Data final"
          className="cv-input h-9 px-2 py-1 text-[12px]"
          min={from || undefined}
          onChange={(e) => onToChange(e.target.value)}
          type="date"
          value={to}
        />
      </label>
      {invalid && (
        <span className="text-[11px] font-medium text-[var(--danger)]" role="alert">
          &lsquo;De&rsquo; deve ser ≤ &lsquo;até&rsquo;
        </span>
      )}
    </div>
  );
}
