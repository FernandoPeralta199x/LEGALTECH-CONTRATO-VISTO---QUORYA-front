import { apiClient } from "./apiClient";

/**
 * Ações operacionais do caso (writer: admin/analyst) que antes só existiam no
 * backend: executar a triagem, gerar o parecer e registrar a revisão humana.
 * Os endpoints são os mesmos exercitados pelo backend serverless.
 */

export type TriageRunResult = {
  modules_executed: number;
  risk_level: string;
  risk_signals: string[];
};

/** Executa a triagem do caso (roda os módulos via adapters). Idempotente por caso. */
export async function runCaseTriage(caseId: string): Promise<TriageRunResult> {
  const res = await apiClient.post<TriageRunResult>(
    `/api/v1/cases/${caseId}/triage/run`,
    {}
  );
  return res.data;
}

/** Gera (ou regenera) o parecer consolidando as evidências da triagem. */
export async function generateCaseReport(caseId: string): Promise<void> {
  await apiClient.post(`/api/v1/cases/${caseId}/report/generate`, {});
}

/** Revisão humana do parecer: 'reviewed' registra o revisor; 'approved' conclui o caso. */
export async function reviewCaseReport(
  caseId: string,
  input: { status: "reviewed" | "approved"; reviewNotes?: string }
): Promise<void> {
  await apiClient.post(`/api/v1/cases/${caseId}/report/review`, {
    status: input.status,
    review_notes: input.reviewNotes ?? null
  });
}
