"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  RefreshCw,
  Shield,
  Upload,
} from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatBytes, formatDate } from "@/lib/formatters";
import { recommendationLabel, reportStatusLabel } from "@/lib/reportLabels";
import type { FinalReportDocument } from "@/services/finalReports";
import type { Report } from "@/types";

type CaseReportTabProps = {
  finalReport: {
    docs: FinalReportDocument[];
    uploading: boolean;
    error: string;
    success: string;
    acceptAttr: string;
    onUpload: (event: FormEvent<HTMLInputElement>) => void;
    onDownload: (documentId: string) => void;
  };
  report: {
    data: Report | null;
    busy: boolean;
    canWrite: boolean;
    isCompleted: boolean;
    paymentPending: boolean;
    onGenerate: () => void;
    onApprove: () => void;
  };
};

/**
 * Aba "Relatório" do caso. PRESENTACIONAL, extraída do god-file cases/[id]/page.tsx:
 * todo o estado e os handlers ficam no pai (que também os usa na Visão geral) e
 * chegam por props agrupadas. Sem mudança de comportamento.
 */
export function CaseReportTab({ finalReport, report }: CaseReportTabProps) {
  const { docs, uploading, error, success, acceptAttr, onUpload, onDownload } =
    finalReport;
  const {
    data: reportData,
    busy,
    canWrite,
    isCompleted,
    paymentPending,
    onGenerate,
    onApprove,
  } = report;

  return (
    <div className="animate-in space-y-6">
      {/* Final report upload + list (always visible) */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Upload size={18} style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-bold text-[var(--text)]">
            Relatório final do analista
          </h3>
        </div>
        <p className="text-xs text-[var(--text2)] mb-4">
          Faça upload do relatório jurídico finalizado pelo analista. Aceita
          PDF, DOCX ou TXT (máx. 25 MB). Ficará vinculado ao caso e disponível
          para download posterior.
        </p>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-[rgba(32,201,151,0.3)] bg-[var(--teal-dim)] px-3 py-2 text-xs text-[var(--teal)]">
            <CheckCircle2 size={14} />
            {success}
          </div>
        )}

        {/* FE-02/FE-03: o upload do relatório final bate em POST /documents @require_writer —
            só writers veem o dropzone (não-writers já têm o banner "Modo leitura" na página). */}
        {canWrite && (
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--bd2)] bg-[var(--surf2)] px-4 py-6 text-sm font-medium text-[var(--text2)] transition hover:border-[var(--accent)] hover:bg-[var(--surf3)] ${
              uploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <Upload size={16} />
            {uploading ? "Enviando..." : "Selecionar arquivo (PDF, DOCX, TXT)"}
            <input
              accept={acceptAttr}
              aria-label="Enviar relatório final (PDF, DOCX ou TXT)"
              className="sr-only"
              disabled={uploading}
              onChange={onUpload}
              type="file"
            />
          </label>
        )}

        {docs.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-[var(--text3)]">
              Relatórios enviados ({docs.length})
            </p>
            {docs.map((doc, index) => (
              <div
                className="animate-in flex items-center gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-4 py-3"
                key={doc.id}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <FileText className="shrink-0 text-[var(--text2)]" size={16} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text)]">
                    {doc.filename}
                  </p>
                  <p className="text-[11px] text-[var(--text3)]">
                    <span className="font-mono">{formatBytes(doc.sizeBytes)}</span>
                    {doc.uploadedAt ? ` · ${formatDate(doc.uploadedAt)}` : ""}
                  </p>
                </div>
                {canWrite && (
                  <button
                    className="cv-icon-btn"
                    onClick={() => void onDownload(doc.id)}
                    title="Baixar"
                    type="button"
                  >
                    <Download size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* AI-generated preliminary report */}
      {!reportData ? (
        <EmptyState
          action={
            canWrite && !paymentPending ? (
              <Button
                icon={<FileText aria-hidden="true" size={15} />}
                loading={busy}
                onClick={onGenerate}
              >
                Gerar relatório
              </Button>
            ) : undefined
          }
          description="O relatório ainda não foi gerado. Gere o parecer a partir das evidências da triagem."
          icon={<Shield size={20} />}
          title="Relatório preliminar não disponível"
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-bold text-[var(--text)]">
                  {reportData.title}
                </h2>
                <p className="mt-1 text-[11px] text-[var(--text3)]">
                  Versão <span className="font-mono">{reportData.version}</span> ·{" "}
                  {formatDate(reportData.generatedAt)}
                </p>
              </div>
              <StatusBadge status={reportData.status} />
            </div>

            {canWrite && !isCompleted && (
              <div className="mb-5 flex flex-wrap gap-2">
                <Button
                  icon={<RefreshCw aria-hidden="true" size={15} />}
                  loading={busy}
                  onClick={onGenerate}
                  variant="secondary"
                >
                  Regerar relatório
                </Button>
                <Button
                  disabled={busy}
                  icon={<CheckCircle2 aria-hidden="true" size={15} />}
                  onClick={() => onApprove()}
                >
                  Aprovar relatório
                </Button>
              </div>
            )}

            {reportData.status === "in_review" && (
              <div className="mb-5 flex items-center gap-3 rounded-lg border border-[rgba(249,115,22,0.25)] bg-[var(--orange-dim)] px-4 py-3">
                <AlertTriangle
                  className="shrink-0 text-[var(--orange)]"
                  size={16}
                />
                <p className="text-xs text-[var(--text2)]">
                  Este relatório passou por revisão automática. A validação
                  humana e a aprovação serão habilitadas em breve.
                </p>
              </div>
            )}

            <p className="text-sm leading-6 text-[var(--text2)]">
              {reportData.summary}
            </p>
            <dl className="mt-5 grid gap-3 border-t border-[var(--bd)] pt-4 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-[var(--text3)]">Recomendação</dt>
                <dd className="mt-0.5 font-semibold text-[var(--text)]">
                  {recommendationLabel(reportData.recommendation)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text3)]">Confiança</dt>
                <dd className="mt-0.5 font-semibold text-[var(--text)]">
                  {typeof reportData.confidence === "number" ? (
                    <span className="font-mono">
                      {(reportData.confidence * 100).toFixed(0)}%
                    </span>
                  ) : (
                    "Não informado"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text3)]">Status</dt>
                <dd className="mt-0.5 font-semibold text-[var(--text)]">
                  {reportStatusLabel(reportData)}
                </dd>
              </div>
            </dl>
          </Card>

          {reportData.risks.length > 0 && (
            <Card title="Indicadores de risco">
              <div className="space-y-4">
                {reportData.risks.map((risk, index) => (
                  <div
                    className={`animate-in rounded-lg border p-4 ${
                      risk.level === "high"
                        ? "border-red-500/20 bg-red-500/5"
                        : risk.level === "medium"
                          ? "border-[rgba(249,115,22,0.2)] bg-[var(--orange-dim)]"
                          : risk.level === "low"
                            ? "border-[rgba(32,201,151,0.2)] bg-[var(--teal-dim)]"
                            // UI-03: sem severidade (o backend não a envia) → moldura neutra,
                            // nunca o verde de "baixo". O título já categoriza o risco.
                            : "border-[var(--bd)] bg-[var(--surf2)]"
                    }`}
                    key={risk.id}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {risk.level && <StatusBadge status={risk.level} />}
                      <p className="text-sm font-semibold text-[var(--text)]">
                        {risk.title}
                      </p>
                    </div>
                    <p className="text-xs leading-5 text-[var(--text2)]">
                      {risk.description}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {reportData.recommendations.length > 0 && (
            <Card title="Recomendações">
              <ul className="space-y-2">
                {reportData.recommendations.map((rec, i) => (
                  <li
                    className="animate-in flex items-start gap-3"
                    key={i}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <CheckCircle2
                      className="mt-0.5 shrink-0 text-[var(--teal)]"
                      size={14}
                    />
                    <p className="text-xs leading-5 text-[var(--text2)]">
                      {recommendationLabel(rec)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {reportData.limitations && reportData.limitations.length > 0 && (
            <Card title="Limitações">
              <ul className="space-y-2">
                {reportData.limitations.map((limitation, index) => (
                  <li
                    className="animate-in text-xs leading-5 text-[var(--text2)]"
                    key={index}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    {limitation}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {reportData.sourceRefs && reportData.sourceRefs.length > 0 && (
            <Card title="Fontes utilizadas">
              <ul className="space-y-2">
                {reportData.sourceRefs.map((sourceRef, index) => (
                  <li
                    className="animate-in text-xs leading-5 text-[var(--text2)]"
                    key={index}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    {sourceRef}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="flex items-center gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] p-4">
            <FileText className="shrink-0 text-[var(--text3)]" size={16} />
            <p className="text-xs text-[var(--text2)]">
              A exportação em PDF será habilitada em breve.
            </p>
            <span className="ml-auto shrink-0 cv-badge cv-badge-muted">
              Em breve
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
