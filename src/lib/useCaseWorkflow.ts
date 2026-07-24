"use client";

import { useState } from "react";

import { errorMessage } from "@/lib/errorMessage";
import {
  generateCaseReport,
  reviewCaseReport,
  runCaseTriage
} from "@/services/caseWorkflow";

export type WorkflowNotice = {
  tone: "success" | "error";
  title: string;
  description: string;
};

/**
 * Ações de workflow do caso (triagem, geração e aprovação de relatório) e o
 * estado que só existe por causa delas — extraído de cases/[id]/page.tsx.
 *
 * Cada ação é idempotente sob clique repetido (guarda `busy`), zera o aviso
 * anterior, chama o serviço, dá `refreshCase()` no sucesso e traduz qualquer
 * erro para uma mensagem segura. Nenhum acoplamento ao estado dos dados do
 * caso: recebe só `id` e `refreshCase`.
 */
export function useCaseWorkflow(id: string, refreshCase: () => Promise<void>) {
  const [triageRunning, setTriageRunning] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [workflowNotice, setWorkflowNotice] = useState<WorkflowNotice | null>(null);

  async function runTriage() {
    if (triageRunning) return;
    setTriageRunning(true);
    setWorkflowNotice(null);
    try {
      const result = await runCaseTriage(id);
      await refreshCase();
      setWorkflowNotice({
        tone: "success",
        title: "Triagem executada",
        description: `${result.modules_executed} módulos processados. Risco estimado: ${result.risk_level}.`
      });
    } catch (err) {
      setWorkflowNotice({
        tone: "error",
        title: "Falha na triagem",
        description: errorMessage(err, "Não foi possível executar a triagem.")
      });
    } finally {
      setTriageRunning(false);
    }
  }

  async function generateReport() {
    if (reportBusy) return;
    setReportBusy(true);
    setWorkflowNotice(null);
    try {
      await generateCaseReport(id);
      await refreshCase();
      setWorkflowNotice({
        tone: "success",
        title: "Relatório gerado",
        description: "Parecer consolidado a partir das evidências da triagem."
      });
    } catch (err) {
      setWorkflowNotice({
        tone: "error",
        title: "Falha ao gerar relatório",
        description: errorMessage(err, "Não foi possível gerar o relatório.")
      });
    } finally {
      setReportBusy(false);
    }
  }

  async function approveReport() {
    if (approving) return;
    setApproving(true);
    setWorkflowNotice(null);
    try {
      await reviewCaseReport(id, { status: "approved" });
      await refreshCase();
      setApproveOpen(false);
      setWorkflowNotice({
        tone: "success",
        title: "Relatório aprovado",
        description: "Revisão humana registrada; o caso foi concluído."
      });
    } catch (err) {
      setWorkflowNotice({
        tone: "error",
        title: "Falha ao aprovar",
        description: errorMessage(err, "Não foi possível aprovar o relatório.")
      });
    } finally {
      setApproving(false);
    }
  }

  return {
    triageRunning,
    reportBusy,
    approving,
    approveOpen,
    workflowNotice,
    runTriage,
    generateReport,
    approveReport,
    openApprove: () => setApproveOpen(true),
    closeApprove: () => setApproveOpen(false),
    dismissNotice: () => setWorkflowNotice(null)
  };
}
