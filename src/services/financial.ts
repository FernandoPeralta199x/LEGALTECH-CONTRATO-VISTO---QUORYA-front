import { apiClient } from "./apiClient";
import { financialQuery } from "./financialRange";

/** KPIs da visão geral financeira (backend calcula; frontend só exibe).
 *  Campos em centavos. `null` = sem fonte de dados hoje → exibir "R$ —". */
export type FinancialOverviewKpis = {
  count: number;
  gross_cents: number;
  received_cents: number;
  pending_cents: number;
  canceled_cents: number;
  refunded_cents: number;
  ticket_cents: number | null;
  overdue_cents: number | null;
  net_cents: number | null;
  api_cost_cents: number | null;
  tax_cents: number | null;
  invoices_count: number | null;
  margin_cents: number | null;
};

export type FinancialOverview = {
  period: string;
  range: { from: string; to: string };
  currency: string;
  kpis: FinancialOverviewKpis;
};

/** GET /financial/overview — SEM fallback mock: dado financeiro é real ou erro
 *  (a tela mostra estado de erro honesto; nunca número forjado). */
export async function getFinancialOverview(
  period: string,
  from?: string,
  to?: string
): Promise<FinancialOverview> {
  const res = await apiClient.get<FinancialOverview>(
    `/api/v1/financial/overview?${financialQuery(period, from, to)}`
  );
  return res.data as FinancialOverview;
}
