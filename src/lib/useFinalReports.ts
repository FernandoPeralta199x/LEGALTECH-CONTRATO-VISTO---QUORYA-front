"use client";

import { useCallback, useState, type FormEvent, type RefObject } from "react";

import {
  FINAL_REPORT_ACCEPTED_MIME,
  getFinalReportDownloadUrl,
  listFinalReports,
  uploadFinalReport,
  type FinalReportDocument
} from "@/services/finalReports";
import { errorMessage } from "@/lib/errorMessage";

const ALLOWED_FINAL_REPORT_EXT = ["pdf", "docx", "doc", "txt"];
// 25 MB — teto generoso para relatórios jurídicos (o backend enforça o limite real,
// mais restritivo). Validação de UX no cliente para feedback imediato.
const FINAL_REPORT_MAX_BYTES = 25 * 1024 * 1024;

/** Valida o arquivo de relatório final por MIME/extensão e tamanho. Função PURA (extraída
 *  de cases/[id] para teste) — devolve a mensagem de erro ou null quando válido. Mesmas
 *  regras e mensagens do handler original. */
export function validateFinalReportFile(file: File): string | null {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (
    !FINAL_REPORT_ACCEPTED_MIME.includes(file.type) &&
    !ALLOWED_FINAL_REPORT_EXT.includes(ext)
  ) {
    return "Tipo de arquivo não suportado. Envie PDF, DOCX ou TXT.";
  }
  if (file.size > FINAL_REPORT_MAX_BYTES) {
    return "Arquivo excede o limite de 25 MB.";
  }
  return null;
}

/** Relatórios finais do caso: listagem + upload validado (MIME/ext/25MB) + download.
 *  Extraído de cases/[id] (fe-struct-02).
 *
 *  Recebe o `loadTokenRef` (ref) COMPARTILHADO com useCaseDetail: refreshFinalReports lê o
 *  token (não incrementa) — quem incrementa é o refreshCase do useCaseDetail, que dispara
 *  esta listagem após carregar o agregado. Assim uma nova carga do caso invalida uma
 *  listagem em voo (evita exibir relatórios do caso errado numa troca de id). O upload NÃO
 *  usa o token e faz prepend otimista — assimetria preservada do original. */
export function useFinalReports(options: {
  caseId: string;
  loadTokenRef: RefObject<number>;
}) {
  const { caseId, loadTokenRef } = options;

  const [finalReports, setFinalReports] = useState<FinalReportDocument[]>([]);
  const [finalReportUploading, setFinalReportUploading] = useState(false);
  const [finalReportError, setFinalReportError] = useState("");
  const [finalReportSuccess, setFinalReportSuccess] = useState("");

  const refreshFinalReports = useCallback(async () => {
    const token = loadTokenRef.current;
    try {
      const reports = await listFinalReports(caseId);
      if (token !== loadTokenRef.current) return;
      setFinalReports(reports);
    } catch (err) {
      if (token !== loadTokenRef.current) return;
      setFinalReportError(errorMessage(err, "Não foi possível carregar relatórios finais."));
      setFinalReports([]);
    }
  }, [caseId, loadTokenRef]);

  async function handleFinalReportUpload(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const validationError = validateFinalReportFile(file);
    if (validationError) {
      setFinalReportError(validationError);
      input.value = "";
      return;
    }

    setFinalReportUploading(true);
    setFinalReportError("");
    setFinalReportSuccess("");
    try {
      const doc = await uploadFinalReport(caseId, file);
      setFinalReports((current) => [doc, ...current]);
      setFinalReportSuccess(`"${doc.filename}" enviado com sucesso.`);
    } catch (err) {
      setFinalReportError(errorMessage(err, "Falha ao enviar o relatório."));
    } finally {
      setFinalReportUploading(false);
      input.value = "";
    }
  }

  async function handleFinalReportDownload(documentId: string) {
    try {
      const url = await getFinalReportDownloadUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setFinalReportError(
        errorMessage(err, "Não foi possível gerar o link de download.")
      );
    }
  }

  return {
    finalReports,
    finalReportUploading,
    finalReportError,
    finalReportSuccess,
    refreshFinalReports,
    handleFinalReportUpload,
    handleFinalReportDownload
  };
}
