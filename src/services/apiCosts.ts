import { apiClient } from "./apiClient";
import { financialQuery } from "./financialRange";

export type ApiCostStatus = "previsto" | "processado";

export type ApiCostItem = {
  id: string;
  provider: string;
  operation: string;
  quantity: number;
  unit_cost_cents: number;
  total_cost_cents: number;
  currency: string;
  status: ApiCostStatus;
  incurred_at: string | null;
  request_id: string | null;
  case_id: string | null;
  client_id: string | null;
  external_id: string | null;
  notes: string | null;
  created_at: string | null;
};

export type ApiCostsSummary = {
  api_cost_cents: number;
  api_cost_forecast_cents: number;
  api_cost_quantity: number;
  api_cost_count: number;
  by_provider: { provider: string; total_cents: number }[];
};

/** Uma linha do gasto AUTOMÁTICO: uso real (consultas executadas na triagem) ×
 *  tarifa de custo configurada por provedor. Centavos. */
export type AutoApiProvider = {
  provider: string;
  provider_label: string;
  quantity: number;
  unit_cost_cents: number;
  total_cents: number;
};

export type AutomaticApiCosts = {
  by_provider: AutoApiProvider[];
  total_cents: number;
  calls: number;
  disclaimer: string;
};

export type ApiCostsResponse = {
  period: string;
  range: { from: string; to: string };
  currency: string;
  automatic: AutomaticApiCosts;
  summary: ApiCostsSummary;
  items: ApiCostItem[];
  total: number;
};

export type CreateApiCostPayload = {
  provider: string;
  operation: string;
  quantity: number;
  unit_cost_cents: number;
  status: ApiCostStatus;
  incurred_at?: string | null;
  notes?: string | null;
};

/** GET /financial/api-costs — SEM fallback mock (dado financeiro é real ou erro). */
export async function listApiCosts(
  period: string,
  from?: string,
  to?: string
): Promise<ApiCostsResponse> {
  const res = await apiClient.get<ApiCostsResponse>(
    `/api/v1/financial/api-costs?${financialQuery(period, from, to)}`
  );
  return res.data as ApiCostsResponse;
}

/** POST /financial/api-costs — registro manual (admin). O backend calcula o total. */
export async function createApiCost(
  payload: CreateApiCostPayload
): Promise<ApiCostItem> {
  const res = await apiClient.post<ApiCostItem>("/api/v1/financial/api-costs", payload);
  return res.data as ApiCostItem;
}
