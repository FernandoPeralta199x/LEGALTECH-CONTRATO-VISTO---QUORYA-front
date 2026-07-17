import { apiClient } from "./apiClient";
import { financialQuery } from "./financialRange";

/** Uma linha de serviço (agregação de requests por product_type). Centavos. */
export type ServiceRow = {
  product_type: string;
  product_label: string;
  count: number;
  gross_cents: number;
  received_cents: number;
  pending_cents: number;
  canceled_cents: number;
  ticket_cents: number | null;
};

export type ServicesSummary = {
  services_count: number;
  count: number;
  gross_cents: number;
  received_cents: number;
  pending_cents: number;
  ticket_cents: number | null;
  by_product: ServiceRow[];
};

export type ServicesResponse = {
  period: string;
  range: { from: string; to: string };
  currency: string;
  disclaimer: string;
  summary: ServicesSummary;
};

/** GET /financial/services — receita por serviço. SEM fallback mock. */
export async function getFinancialServices(
  period: string,
  from?: string,
  to?: string
): Promise<ServicesResponse> {
  const res = await apiClient.get<ServicesResponse>(
    `/api/v1/financial/services?${financialQuery(period, from, to)}`
  );
  return res.data as ServicesResponse;
}
