import type { FinancialStatus } from "@/components/financial/FinancialStatusPill";

import { apiClient } from "./apiClient";
import { financialQuery } from "./financialRange";

/** Um recebível (venda pendente a receber). Vencimento = data da venda + prazo da org;
 *  `days_overdue` > 0 = em atraso. `client_name` null = 'Sem cliente atribuído'. Centavos. */
export type ReceivableRow = {
  id: string;
  code: string;
  client_id: string | null;
  client_name: string | null;
  amount_cents: number;
  due_date: string | null;
  days_overdue: number;
  status: FinancialStatus; // overdue | pending
};

export type ReceivablesSummary = {
  count: number;
  total_cents: number;
  overdue_cents: number;
  due_cents: number;
  average_cents: number | null;
};

export type ReceivablesResponse = {
  period: string;
  range: { from: string; to: string };
  currency: string;
  payment_term_days: number;
  disclaimer: string;
  summary: ReceivablesSummary;
  items: ReceivableRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

/** GET /financial/receivables — recebíveis do período (paginados, busca opcional). SEM fallback mock. */
export async function getFinancialReceivables(
  period: string,
  from?: string,
  to?: string,
  page = 1,
  q = ""
): Promise<ReceivablesResponse> {
  const params = new URLSearchParams(financialQuery(period, from, to));
  if (page > 1) params.set("page", String(page));
  const query = q.trim();
  if (query) params.set("q", query);
  const res = await apiClient.get<ReceivablesResponse>(
    `/api/v1/financial/receivables?${params.toString()}`
  );
  return res.data as ReceivablesResponse;
}
