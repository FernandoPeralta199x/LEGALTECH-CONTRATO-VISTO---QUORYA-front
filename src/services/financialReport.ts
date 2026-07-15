import { apiClient } from "./apiClient";

/** Overview cru do backend (compute_overview) — superset dos KPIs da Visão Geral. */
export type ReportOverview = {
  count: number;
  gross_cents: number;
  received_cents: number;
  pending_cents: number;
  canceled_cents: number;
  refunded_cents: number;
  ticket_cents: number | null;
  api_cost_cents: number;
  api_cost_forecast_cents: number;
  tax_cents: number;
  tax_estimated_cents: number;
  tax_confirmed_cents: number;
  invoices_count: number;
  invoices_issuance_cost_cents: number;
  overdue_cents: number | null;
  net_cents: number | null;
  margin_cents: number | null;
};

export type ExecutiveReport = {
  metadata: {
    report_type: string;
    title: string;
    period: string;
    range: { from: string; to: string };
    currency: string;
    generated_at: string;
    generated_by: { user_id: string; email: string | null; role: string };
    filters: { period: string; from: string | null; to: string | null };
  };
  overview: ReportOverview;
  api_costs: {
    summary: {
      api_cost_cents: number;
      api_cost_forecast_cents: number;
      api_cost_quantity: number;
      api_cost_count: number;
    };
    by_provider: { provider: string; total_cents: number }[];
  };
  taxes: {
    disclaimer: string;
    summary: {
      tax_cents: number;
      tax_estimated_cents: number;
      tax_confirmed_cents: number;
      tax_divergent_count: number;
      tax_count: number;
    };
    by_type: { tax_type: string; total_cents: number }[];
  };
  fiscal: {
    disclaimer: string;
    summary: {
      invoices_count: number;
      invoices_authorized_count: number;
      invoices_pending_count: number;
      invoices_rejected_count: number;
      invoices_canceled_count: number;
      invoices_issuance_cost_cents: number;
      invoices_authorized_amount_cents: number;
      invoices_total_count: number;
    };
    by_status: { status: string; count: number }[];
  };
  disclaimers: string[];
};

/** GET /financial/reports/executive — DTO consolidado (backend calcula; FE só exibe). */
export async function getExecutiveReport(period: string): Promise<ExecutiveReport> {
  const res = await apiClient.get<ExecutiveReport>(
    `/api/v1/financial/reports/executive?period=${encodeURIComponent(period)}`
  );
  return res.data as ExecutiveReport;
}
