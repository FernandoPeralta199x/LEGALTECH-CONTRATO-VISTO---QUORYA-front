import { productLabel } from "@/lib/reportLabels";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cents / 100);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatSizeUnit(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${unit}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return formatSizeUnit(bytes / 1024, "KB");
  return formatSizeUnit(bytes / (1024 * 1024), "MB");
}

/** Taxa em basis points -> percentual pt-BR (ex.: 199 -> "1,99"). ARQ-05: fonte
 *  única do formato de juros, antes triplicado inline nas telas de parcelamento. */
export function formatBps(bps: number): string {
  return (bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** Juros mensal por extenso (ex.: 199 -> "1,99% a.m."). */
export function formatBpsMensal(bps: number): string {
  return `${formatBps(bps)}% a.m.`;
}

export function caseDisplayTitle(legalCase: { title?: string | null; metadata?: { title?: unknown }; caseType: string }): string {
  if (legalCase.title?.trim()) {
    return legalCase.title.trim();
  }

  const title = legalCase.metadata?.title;
  return typeof title === "string" && title.trim()
    ? title.trim()
    : productLabel(legalCase.caseType);
}
