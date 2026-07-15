"use client";

import { Info, Printer, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { FinancialReportSheet } from "@/components/financial/FinancialReportSheet";
import type { PeriodKey } from "@/components/financial/PeriodFilter";
import { usePrintOnChange } from "@/lib/usePrintOnChange";
import { getExecutiveReport, type ExecutiveReport } from "@/services/financialReport";

export function ReportsPanel({
  period,
  from,
  to
}: {
  period: PeriodKey;
  from?: string;
  to?: string;
}) {
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [reload, setReload] = useState(0);

  usePrintOnChange(printing, () => setPrinting(false));

  // O período personalizado (com datas) é resolvido pelo pai: este painel só é
  // montado com um preset OU um custom já com from/to válidos.
  useEffect(() => {
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    getExecutiveReport(period, from, to)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setReport(null);
        setError(err instanceof Error ? err.message : "Erro ao gerar o relatório");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, from, to, reload]);

  const canPrint = Boolean(report) && !loading && !error;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-[var(--r)] border border-[rgba(96,165,250,0.22)] bg-[var(--blue-dim)] p-4 print:hidden">
        <Info aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--blue)]" size={16} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">Relatório executivo — gerado no navegador</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
            Todos os valores são <strong className="font-semibold text-[var(--text)]">calculados pelo backend</strong>.
            Use <strong className="font-semibold text-[var(--text)]">Baixar PDF</strong> (ou Ctrl/Cmd+P →
            Salvar como PDF) para exportar. A pré-visualização abaixo é fiel ao PDF impresso.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Relatório executivo
        </p>
        <Button
          disabled={!canPrint}
          icon={<Printer size={15} />}
          onClick={() => setPrinting(true)}
          size="sm"
          variant="primary"
        >
          Baixar PDF
        </Button>
      </div>

      {error && (
        <div
          className="flex items-start gap-3 rounded-[var(--r)] border border-[rgba(239,68,68,0.28)] bg-[var(--danger-dim)] p-4"
          role="alert"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--danger)]" size={16} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text)]">Não foi possível gerar o relatório</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text2)]">{error}</p>
            <Button className="mt-3" onClick={() => setReload((r) => r + 1)} size="sm" variant="secondary">
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="mx-auto h-96 w-full max-w-[820px] animate-pulse rounded-lg bg-[var(--surf2)]" />
      )}

      {/* Pré-visualização WYSIWYG — "folha de papel" branca (mesmo no dark).
          `print:hidden` a tira do fluxo de impressão (só a .cv-print-sheet sai no PDF;
          sem isso a preview invisível inflaria a paginação com páginas em branco). */}
      {!loading && !error && report && (
        <div className="overflow-x-auto print:hidden">
          <div
            className="mx-auto w-full max-w-[820px] rounded-lg shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
            style={{ background: "#fff", padding: "40px 44px" }}
          >
            <FinancialReportSheet report={report} />
          </div>
        </div>
      )}

      {/* Folha de impressão (isolada por .cv-print-sheet; só aparece no print). */}
      <div className="cv-print-sheet" aria-hidden="true">
        {report && <FinancialReportSheet report={report} />}
      </div>
    </div>
  );
}
