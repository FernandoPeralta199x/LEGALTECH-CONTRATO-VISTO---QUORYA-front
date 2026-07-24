import { apiClient } from "./apiClient";
import { financialQuery } from "./financialRange";

/** Receita de um cliente no período. `client_id`/`client_name` = null é o bucket
 *  honesto 'Sem cliente atribuído' (vendas sem caso/cliente vinculado). Centavos. */
export type ClientRevenueRow = {
  client_id: string | null;
  client_name: string | null;
  count: number;
  gross_cents: number;
  received_cents: number;
  pending_cents: number;
  ticket_cents: number | null;
  last_purchase_at: string | null;
};

export type ClientsSummary = {
  clients_count: number;
  unassigned_count: number;
  unassigned_gross_cents: number;
  count: number;
  gross_cents: number;
  received_cents: number;
  pending_cents: number;
  ticket_cents: number | null;
};

export type ClientsResponse = {
  period: string;
  range: { from: string; to: string };
  currency: string;
  disclaimer: string;
  summary: ClientsSummary;
  items: ClientRevenueRow[];
  total: number;
};

/** GET /financial/clients — receita por cliente. SEM fallback mock. */
export async function getFinancialClients(
  period: string,
  from?: string,
  to?: string
): Promise<ClientsResponse> {
  const res = await apiClient.get<ClientsResponse>(
    `/api/v1/financial/clients?${financialQuery(period, from, to)}`
  );
  return res.data as ClientsResponse;
}
