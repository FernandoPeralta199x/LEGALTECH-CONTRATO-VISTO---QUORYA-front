import { apiClient } from "./apiClient";
import { financialQuery } from "./financialRange";

export type TaxStatus =
  | "estimado"
  | "confirmado"
  | "divergente"
  | "cancelado"
  | "nao_aplicavel";

export type TaxItem = {
  id: string;
  tax_type: string;
  base_amount_cents: number;
  rate_bps: number | null;
  estimated_amount_cents: number;
  confirmed_amount_cents: number | null;
  divergence_cents: number | null;
  status: TaxStatus;
  competencia_ano: number;
  competencia_mes: number;
  reference_at: string | null;
  request_id: string | null;
  case_id: string | null;
  client_id: string | null;
  provider: string | null;
  external_id: string | null;
  notes: string | null;
  created_at: string | null;
};

export type TaxesSummary = {
  tax_cents: number;
  tax_estimated_cents: number;
  tax_confirmed_cents: number;
  tax_divergent_count: number;
  tax_count: number;
  by_type: { tax_type: string; total_cents: number }[];
};

export type TaxesResponse = {
  period: string;
  range: { from: string; to: string };
  currency: string;
  disclaimer: string;
  summary: TaxesSummary;
  items: TaxItem[];
  total: number;
};

export type CreateTaxPayload = {
  tax_type: string;
  base_amount_cents: number;
  rate_bps?: number | null;
  estimated_amount_cents: number;
  confirmed_amount_cents?: number | null;
  status: TaxStatus;
  competencia_ano: number;
  competencia_mes: number;
  notes?: string | null;
};

/** GET /financial/taxes — SEM fallback mock (dado fiscal é real ou erro). */
export async function listTaxes(
  period: string,
  from?: string,
  to?: string
): Promise<TaxesResponse> {
  const res = await apiClient.get<TaxesResponse>(
    `/api/v1/financial/taxes?${financialQuery(period, from, to)}`
  );
  return res.data as TaxesResponse;
}

/** POST /financial/taxes — registro manual (admin). O valor é digitado; o backend
 *  só calcula a divergência (confirmado − estimado). */
export async function createTax(payload: CreateTaxPayload): Promise<TaxItem> {
  const res = await apiClient.post<TaxItem>("/api/v1/financial/taxes", payload);
  return res.data as TaxItem;
}
