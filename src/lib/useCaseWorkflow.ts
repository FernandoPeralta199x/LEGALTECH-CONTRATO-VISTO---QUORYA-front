"use client";

import { useState } from "react";

import {
  generateCaseReport,
  reviewCaseReport,
  runCaseTriage
} from "@/services/caseWorkflow";
import { errorMessage } from "@/lib/errorMessage";

type WorkflowNotice = {
  tone: "success" | "error";
  title: string;
  description: string;
};

/** Ações de workflow do caso: rodar triagem, gerar e aprovar relatório. Cada handler chama
 *  a MESMA `refreshCase` memoizada do useCaseDetail para reidratar o agregado após a ação.
 *  Extraído de cases/[id] (fe-struct-02). O estado de UI (busy flags, approveOpen,
 *  workflowNotice) acompanha o fluxo e é exposto para o JSX/ConfirmDialog. */
export function useCaseWorkflow(options: {
  caseId: string;
  refreshCase: () => Promise<void>;
}) {
  const { caseId, refreshCase } = options;

  const [triageRunning, setTriageRunning] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [workflowNotice, setWorkflowNotice] = useState<WorkflowNotice | null>(null);

  async function handleRunTriage() {
    if (triageRunning) return;
    setTriageRunning(true);
    setWorkflowNotice(null);
    try {
      const result = await runCaseTriage(caseId);
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

  async function handleGenerateReport() {
    if (reportBusy) return;
    setReportBusy(true);
    setWorkflowNotice(null);
    try {
      await generateCaseReport(caseId);
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

  async function handleApproveReport() {
    if (approving) return;
    setApproving(true);
    setWorkflowNotice(null);
    try {
      await reviewCaseReport(caseId, { status: "approved" });
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
    approveOpen,
    approving,
    workflowNotice,
    setApproveOpen,
    setWorkflowNotice,
    handleRunTriage,
    handleGenerateReport,
    handleApproveReport
  };
}
