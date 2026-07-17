import { apiClient } from "./apiClient";
import { financialQuery } from "./financialRange";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

/** Uma mudança de campo. `before`/`after` são valores crus da trilha (jsonb):
 *  número (ex.: *_cents), string, boolean, null ou objeto. */
export type AuditChange = { field: string; before: unknown; after: unknown };

export type AuditEvent = {
  id: string;
  created_at: string; // ISO UTC
  user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  changes: AuditChange[];
};

export type AuditSummary = {
  total: number;
  inserts: number;
  updates: number;
  deletes: number;
  actors: number;
  by_resource: { resource_type: string; count: number }[];
};

export type AuditResponse = {
  period: string;
  range: { from: string; to: string };
  resources: string[];
  disclaimer: string;
  summary: AuditSummary;
  items: AuditEvent[];
  total: number;
};

/** GET /financial/audit — trilha financeira (admin-only no backend). Sem mock. */
export async function getFinancialAudit(
  period: string,
  from?: string,
  to?: string,
  resourceType?: string,
  action?: string
): Promise<AuditResponse> {
  const q = new URLSearchParams(financialQuery(period, from, to));
  if (resourceType) q.set("resource_type", resourceType);
  if (action) q.set("action", action);
  const res = await apiClient.get<AuditResponse>(`/api/v1/financial/audit?${q.toString()}`);
  return res.data as AuditResponse;
}
