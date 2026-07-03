"use client";

import { ChevronDown, ChevronUp, Printer } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { evidenceRows, maskedNormalized } from "@/src/lib/evidence";
import type { ProviderResult, TriageModule } from "@/types";

function sourceModeLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = { local: "local", mock: "mock", real: "real" };
  return value ? labels[value] ?? value : "—";
}

function signalLabel(signal: string): string {
  return signal.replace(/_/g, " ");
}

type TriageModuleCardProps = {
  module: TriageModule;
  result?: ProviderResult;
  onPrint: (moduleId: string) => void;
};

export function TriageModuleCard({ module, result, onPrint }: TriageModuleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const rows = evidenceRows(result?.normalizedResult);
  const inlineRows = rows.filter((row) => !row.long).slice(0, 6);
  const hasMore = rows.length > inlineRows.length || rows.some((row) => row.long);
  const confidencePct =
    typeof result?.confidence === "number" ? Math.round(result.confidence * 100) : null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{module.moduleLabel}</p>
          <p className="mt-1 text-[11px] text-[var(--text2)]">
            {module.provider} · {sourceModeLabel(module.sourceMode)}
          </p>
        </div>
        <StatusBadge status={module.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-[var(--text3)]">Tentativas</dt>
          <dd className="font-medium text-[var(--text2)]">{module.attempts}</dd>
        </div>
        <div>
          <dt className="text-[var(--text3)]">Obrigatório</dt>
          <dd className="font-medium text-[var(--text2)]">{module.required ? "Sim" : "Não"}</dd>
        </div>
      </dl>

      {module.reason && (
        <p className="mt-3 text-xs leading-5 text-[var(--text2)]">{module.reason}</p>
      )}

      {result && (inlineRows.length > 0 || confidencePct !== null) && (
        <div className="mt-3 border-t border-[var(--bd)] pt-3">
          {inlineRows.length > 0 && (
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text3)]">
                Dados retornados
              </p>
              <dl className="space-y-1.5 text-xs">
                {inlineRows.map((row) => (
                  <div className="flex items-start justify-between gap-3" key={row.key}>
                    <dt className="text-[var(--text3)]">{row.label}</dt>
                    <dd className="min-w-0 truncate text-right font-medium text-[var(--text2)]">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {(result.riskSignals?.length ?? 0) > 0 || confidencePct !== null ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {result.riskSignals?.map((signal) => (
                <span className="cv-badge cv-badge-muted" key={signal}>
                  {signalLabel(signal)}
                </span>
              ))}
              {confidencePct !== null && (
                <span className="ml-auto text-[11px] text-[var(--text3)]">
                  confiança {confidencePct}%
                </span>
              )}
            </div>
          ) : null}
          {confidencePct !== null && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--surf3)]">
              <div
                className="h-full rounded-full bg-[var(--teal)]"
                style={{ width: `${confidencePct}%` }}
              />
            </div>
          )}

          {hasMore && (
            <button
              aria-expanded={expanded}
              className="mt-3 flex items-center gap-1 text-[11px] font-medium text-[var(--teal)]"
              onClick={() => setExpanded((current) => !current)}
              type="button"
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? "Ocultar dados completos" : "Ver tudo"}
            </button>
          )}
          {expanded && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-[var(--bd)] bg-[var(--surf2)] p-3 text-[11px] leading-5 text-[var(--text2)] whitespace-pre-wrap break-words">
              {JSON.stringify(maskedNormalized(result.normalizedResult), null, 2)}
            </pre>
          )}
        </div>
      )}

      {module.summary && (
        <p className="mt-3 border-t border-[var(--bd)] pt-3 text-xs leading-5 text-[var(--text2)]">
          {module.summary}
        </p>
      )}
      {module.errorMessage && (
        <p className="mt-2 text-xs text-red-700">{module.errorMessage}</p>
      )}

      {result && (
        <div className="mt-3 flex justify-end">
          <button
            className="flex items-center gap-1.5 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-1.5 text-[11px] font-medium text-[var(--text2)] transition hover:bg-[var(--surf3)]"
            onClick={() => onPrint(module.id)}
            type="button"
          >
            <Printer aria-hidden="true" size={13} />
            Imprimir / salvar PDF
          </button>
        </div>
      )}
    </Card>
  );
}
