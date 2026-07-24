"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { errorMessage } from "@/lib/errorMessage";
import { aggregatePartyFromCaseParty } from "@/lib/useCasePartiesEditor";
import { getCaseAggregate } from "@/services/cases";
import {
  FINAL_REPORT_ACCEPTED_MIME,
  getFinalReportDownloadUrl,
  listFinalReports,
  uploadFinalReport,
  type FinalReportDocument
} from "@/services/finalReports";
import type { Case, CaseAggregate, CaseParty, Document } from "@/types";

export type FinalReportFeedback = { kind: "error" | "success"; text: string };

/**
 * Dados do detalhe do caso (agregado + documentos + partes + relatórios finais)
 * e o carregamento com guarda de corrida — extraído de cases/[id]/page.tsx sem
 * mudar comportamento.
 *
 * O `latestLoad` (token) invalida o setState de um refresh anterior quando o id
 * troca ou um novo refresh começa; case e relatórios finais compartilham o MESMO
 * token de propósito (um id trocado no meio do voo descarta ambos). `syncCaseParties`
 * segue o M16 (updater puro; os três setState no nível do handler, não aninhados).
 */
export function useCaseDetail(id: string) {
  const [caseAggregate, setCaseAggregate] = useState<CaseAggregate | null>(null);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [caseDocuments, setCaseDocuments] = useState<Document[]>([]);
  const [caseParties, setCaseParties] = useState<CaseParty[]>([]);
  const [error, setError] = useState("");
  const [fallbackReason, setFallbackReason] = useState("");
  const [aggregateSource, setAggregateSource] = useState<"api" | "mock">("api");
  const [loading, setLoading] = useState(true);

  const [finalReports, setFinalReports] = useState<FinalReportDocument[]>([]);
  const [finalReportUploading, setFinalReportUploading] = useState(false);
  // ARQ-04: erro e sucesso do relatório final num ÚNICO estado — antes eram dois
  // useState soltos e um refreshFinalReports que setava erro sem limpar o sucesso,
  // podendo renderizar sucesso e erro ao mesmo tempo. Estado único torna a
  // inconsistência inexpressável por construção.
  const [finalReportFeedback, setFinalReportFeedback] = useState<FinalReportFeedback | null>(null);

  // Token de carga: invalida o setState de um refresh anterior quando o id troca
  // (ou um novo refresh começa), evitando exibir dados do caso errado numa corrida.
  const latestLoad = useRef(0);

  const refreshFinalReports = useCallback(async () => {
    const token = latestLoad.current;
    try {
      const reports = await listFinalReports(id);
      if (token !== latestLoad.current) return;
      setFinalReports(reports);
    } catch (err) {
      if (token !== latestLoad.current) return;
      setFinalReportFeedback({ kind: "error", text: errorMessage(err, "Não foi possível carregar relatórios finais.") });
      setFinalReports([]);
    }
  }, [id]);

  async function handleFinalReportUpload(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    // Validate MIME / extension
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const allowedExt = ["pdf", "docx", "doc", "txt"];
    if (
      !FINAL_REPORT_ACCEPTED_MIME.includes(file.type) &&
      !allowedExt.includes(ext)
    ) {
      setFinalReportFeedback({
        kind: "error",
        text: "Tipo de arquivo não suportado. Envie PDF, DOCX ou TXT."
      });
      input.value = "";
      return;
    }

    // Size limit: 25 MB (a generous cap for legal reports)
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFinalReportFeedback({ kind: "error", text: "Arquivo excede o limite de 25 MB." });
      input.value = "";
      return;
    }

    setFinalReportUploading(true);
    setFinalReportFeedback(null);
    try {
      const doc = await uploadFinalReport(id, file);
      setFinalReports((current) => [doc, ...current]);
      setFinalReportFeedback({ kind: "success", text: `"${doc.filename}" enviado com sucesso.` });
    } catch (err) {
      setFinalReportFeedback({ kind: "error", text: errorMessage(err, "Falha ao enviar o relatório.") });
    } finally {
      setFinalReportUploading(false);
      input.value = "";
    }
  }

  async function handleFinalReportDownload(documentId: string) {
    // FE-04: abre a aba NO GESTO do clique (antes do await), senão o popup é bloqueado
    // por abrir fora do handler síncrono. Depois aponta a aba já aberta para a URL.
    const win = window.open("", "_blank");
    if (win) win.opener = null; // mitiga reverse tabnabbing (sem perder a referência)
    try {
      const url = await getFinalReportDownloadUrl(documentId);
      if (win) win.location.href = url;
      else window.location.href = url; // fallback se o popup foi bloqueado mesmo assim
    } catch (err) {
      win?.close();
      setFinalReportFeedback({
        kind: "error",
        text: errorMessage(err, "Não foi possível gerar o link de download.")
      });
    }
  }

  const refreshCase = useCallback(async () => {
    const token = ++latestLoad.current;
    setLoading(true);
    setError("");

    try {
      const aggregateResult = await getCaseAggregate(id);
      if (token !== latestLoad.current) return; // id trocou / novo refresh — descarta
      setCaseAggregate(aggregateResult.data);
      setCaseData(aggregateResult.data.case);
      setCaseDocuments(aggregateResult.data.documents);
      setCaseParties(aggregateResult.data.parties);
      setAggregateSource(aggregateResult.source);
      setFallbackReason(
        aggregateResult.source === "mock" ? aggregateResult.fallbackReason ?? "" : ""
      );
      void refreshFinalReports();
    } catch (err) {
      if (token !== latestLoad.current) return;
      setError(errorMessage(err));
      setFallbackReason("");
      setCaseAggregate(null);
      setCaseData(null);
      setCaseDocuments([]);
      setCaseParties([]);
    } finally {
      if (token === latestLoad.current) setLoading(false);
    }
  }, [id, refreshFinalReports]);

  function syncCaseParties(updater: (current: CaseParty[]) => CaseParty[]) {
    // M16: updater PURO. Antes, setCaseData/setCaseAggregate eram chamados DENTRO do
    // updater de setCaseParties — em React StrictMode o updater é invocado 2x (para
    // detectar impureza), disparando os setState aninhados em duplicidade. Agora
    // calculamos `next` do valor atual e disparamos os três setState no nível do
    // handler; cada um continua com um updater próprio e puro.
    const next = updater(caseParties);
    setCaseParties(next);
    setCaseData((currentCase) =>
      currentCase ? { ...currentCase, parties: next } : currentCase
    );
    setCaseAggregate((currentAggregate) =>
      currentAggregate
        ? {
            ...currentAggregate,
            case: { ...currentAggregate.case, parties: next },
            parties: next.map((party) =>
              aggregatePartyFromCaseParty(
                party,
                currentAggregate.case.organizationId ?? ""
              )
            ),
            summary: {
              ...currentAggregate.summary,
              partiesCount: next.length
            }
          }
        : currentAggregate
    );
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCase();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshCase]);

  return {
    caseAggregate,
    caseData,
    caseDocuments,
    caseParties,
    error,
    fallbackReason,
    aggregateSource,
    loading,
    finalReports,
    finalReportUploading,
    finalReportFeedback,
    refreshCase,
    syncCaseParties,
    setFallbackReason,
    handleFinalReportUpload,
    handleFinalReportDownload
  };
}
