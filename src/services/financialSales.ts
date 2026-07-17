import type { FinancialStatus } from "@/components/financial/FinancialStatusPill";

import { apiClient } from "./apiClient";
import { financialQuery } from "./financialRange";

/** Uma venda (projeção de um `request`). `client_name` null = 'Sem cliente atribuído'
 *  (venda sem caso/cliente vinculado). Sem modelo de desconto: final = bruto. Centavos. */
export type SaleRow = {
  id: string;
  code: string;
  client_id: string | null;
  client_name: string | null;
  product_type: string;
  service: string;
  gross_cents: number;
  discount_cents: number;
  final_cents: number;
  /** Desfecho comercial derivado do pagamento (distinto do detalhe em payment_status). */
  sale_status: FinancialStatus;
  payment_status: FinancialStatus;
  note_status: FinancialStatus;
  created_at: string | null;
};

export type SalesSummary = {
  count: number;
  gross_cents: number;
  received_cents: number;
  pending_cents: number;
  canceled_cents: number;
  simulated_cents: number;
  refunded_cents: number;
  ticket_cents: number | null;
};

export type SalesResponse = {
  period: string;
  range: { from: string; to: string };
  currency: string;
  disclaimer: string;
  summary: SalesSummary;
  items: SaleRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

/** GET /financial/sales — vendas do período (paginadas, busca opcional). SEM fallback mock. */
export async function getFinancialSales(
  period: string,
  from?: string,
  to?: string,
  page = 1,
  q = ""
): Promise<SalesResponse> {
  const params = new URLSearchParams(financialQuery(period, from, to));
  if (page > 1) params.set("page", String(page));
  const query = q.trim();
  if (query) params.set("q", query);
  const res = await apiClient.get<SalesResponse>(
    `/api/v1/financial/sales?${params.toString()}`
  );
  return res.data as SalesResponse;
}
