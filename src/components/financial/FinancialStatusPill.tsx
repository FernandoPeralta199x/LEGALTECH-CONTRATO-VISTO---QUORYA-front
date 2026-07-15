import { cn } from "@/lib/cn";

/** Vocabulário de status financeiro/fiscal (ABA_FINANCEIRO_ROBUSTO). Espelha os
 *  status do seam de pagamento do backend (adapters/payment.Status) e amplia com
 *  status de venda, recebível e nota fiscal. */
export type FinancialStatus =
  // venda / pagamento
  | "paid"
  | "received"
  | "pending"
  | "processing"
  | "in_analysis"
  | "partial"
  | "overdue"
  | "canceled"
  | "refunded"
  | "chargeback"
  | "failed"
  | "expired"
  // nota fiscal
  | "authorized"
  | "note_pending"
  | "rejected"
  | "note_canceled"
  | "not_required"
  // custo de API (Fase 4) — espelham os valores do backend
  | "previsto"
  | "processado"
  // tributo (Fase 5) — espelham os valores do backend
  | "estimado"
  | "confirmado"
  | "divergente"
  | "cancelado"
  | "nao_aplicavel";

type Tone = "teal" | "orange" | "red" | "blue" | "muted";

const STATUS_META: Record<FinancialStatus, { label: string; tone: Tone }> = {
  paid: { label: "Pago", tone: "teal" },
  received: { label: "Recebido", tone: "teal" },
  pending: { label: "Pendente", tone: "orange" },
  processing: { label: "Processando", tone: "blue" },
  in_analysis: { label: "Em análise", tone: "blue" },
  partial: { label: "Parcial", tone: "orange" },
  overdue: { label: "Em atraso", tone: "red" },
  canceled: { label: "Cancelado", tone: "red" },
  refunded: { label: "Reembolsado", tone: "red" },
  chargeback: { label: "Chargeback", tone: "red" },
  failed: { label: "Falhou", tone: "red" },
  expired: { label: "Expirado", tone: "muted" },
  authorized: { label: "Nota emitida", tone: "teal" },
  note_pending: { label: "Nota pendente", tone: "orange" },
  rejected: { label: "Nota rejeitada", tone: "red" },
  note_canceled: { label: "Nota cancelada", tone: "muted" },
  not_required: { label: "Sem nota", tone: "muted" },
  previsto: { label: "Previsto", tone: "orange" },
  processado: { label: "Processado", tone: "teal" },
  estimado: { label: "Estimado", tone: "orange" },
  confirmado: { label: "Confirmado", tone: "teal" },
  divergente: { label: "Divergente", tone: "red" },
  cancelado: { label: "Cancelado", tone: "muted" },
  nao_aplicavel: { label: "Não aplicável", tone: "muted" }
};

const TONE_CLASS: Record<Tone, string> = {
  teal: "cv-badge-teal",
  orange: "cv-badge-orange",
  red: "cv-badge-red",
  blue: "cv-badge-blue",
  muted: "cv-badge-muted"
};

export function financialStatusLabel(status: FinancialStatus): string {
  return STATUS_META[status].label;
}

/** Badge de status financeiro, reusando o vocabulário visual .cv-badge-*. */
export function FinancialStatusPill({
  status,
  className
}: {
  status: FinancialStatus;
  className?: string;
}) {
  // Fallback defensivo: um status fora do mapa (ex.: novo valor do backend) não
  // deve quebrar a renderização da linha/tabela.
  const meta = STATUS_META[status] ?? { label: String(status), tone: "muted" as const };
  return (
    <span className={cn("cv-badge", TONE_CLASS[meta.tone], className)}>
      {meta.label}
    </span>
  );
}
