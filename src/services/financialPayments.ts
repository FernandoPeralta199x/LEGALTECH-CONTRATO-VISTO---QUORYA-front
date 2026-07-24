import type { FinancialStatus } from "@/components/financial/FinancialStatusPill";

import { apiClient } from "./apiClient";
import { financialQuery } from "./financialRange";

/** Um pagamento (projeção de `requests.installment_plan`). Valor = COBRADO (com juros);
 *  sem gateway real nesta fase → fee = 0 e net = valor. `client_name` null = 'Sem
 *  cliente atribuído'. Centavos. */
export type PaymentRow = {
  id: string;            // id da cobrança (external_reference do provider)
  request_id: string;
  code: string;          // venda
  client_id: string | null;
  client_name: string | null;
  method: string;        // pix | boleto | cartao | debito
  method_label: string;  // rótulo pt-BR já resolvido pelo backend
  installments: number;
  amount_cents: number;
  fee_cents: number;
  net_cents: number;
  payment_status: FinancialStatus;
  paid_at: string | null;
};

export type PaymentsSummary = {
  count: number;
  total_cents: number;
  received_cents: number;
  simulated_cents: number;
  average_cents: number | null;
};

export type PaymentsResponse = {
  period: string;
  range: { from: string; to: string };
  currency: string;
  disclaimer: string;
  summary: PaymentsSummary;
  items: PaymentRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

/** GET /financial/payments — pagamentos do período (paginados, busca opcional). SEM fallback mock. */
export async function getFinancialPayments(
  period: string,
  from?: string,
  to?: string,
  page = 1,
  q = ""
): Promise<PaymentsResponse> {
  const params = new URLSearchParams(financialQuery(period, from, to));
  if (page > 1) params.set("page", String(page));
  const query = q.trim();
  if (query) params.set("q", query);
  const res = await apiClient.get<PaymentsResponse>(
    `/api/v1/financial/payments?${params.toString()}`
  );
  return res.data as PaymentsResponse;
}
