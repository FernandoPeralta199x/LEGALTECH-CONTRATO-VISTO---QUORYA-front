import { centsToReaisLabel } from "@/components/CurrencyInput";
import { cn } from "@/lib/cn";

type MoneyTextProps = {
  /** Valor em centavos (fonte de verdade). null/undefined → "R$ —". */
  cents: number | null | undefined;
  /** Cinza (text3) — usar em estado vazio/sem dados. */
  muted?: boolean;
  className?: string;
};

/** Exibe um valor monetário (centavos → BRL) com dígitos tabulares em fonte mono.
 *  Valores negativos (estorno/reembolso) ganham a cor de perigo; estado vazio é
 *  neutro. Sempre delega a formatação ao helper único centsToReaisLabel — nunca
 *  formata número no componente. */
export function MoneyText({ cents, muted, className }: MoneyTextProps) {
  const isNegative = typeof cents === "number" && !Number.isNaN(cents) && cents < 0;

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        muted
          ? "text-[var(--text3)]"
          : isNegative
            ? "text-[var(--danger)]"
            : "text-[var(--text)]",
        className
      )}
    >
      {centsToReaisLabel(cents)}
    </span>
  );
}
