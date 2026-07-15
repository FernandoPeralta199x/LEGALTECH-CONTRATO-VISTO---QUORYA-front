"use client";

import { Info, Printer, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { FinancialReportSheet } from "@/components/financial/FinancialReportSheet";
import type { PeriodKey } from "@/components/financial/PeriodFilter";
import { usePrintOnChange } from "@/lib/usePrintOnChange";
import { getExecutiveReport, type ExecutiveReport } from "@/services/financialReport";

export function ReportsPanel({ period }: { period: PeriodKey }) {
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [reload, setReload] = useState(0);

  // Intervalo personalizado ainda não tem inputs de data aqui (o backend exige
  // from/to). Bloqueia o relatório com uma dica honesta até existirem.
  const isCustom = period === "custom";

  usePrintOnChange(printing, () => setPrinting(false));

  useEffect(() => {
    if (isCustom) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setReport(null);
      setError(null);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getExecutiveReport(period)
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
  }, [period, reload, isCustom]);

  const canPrint = Boolean(report) && !loading && !error && !isCustom;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-[var(--r)] border border-[rgba(96,165,250,0.22)] bg-[var(--blue-dim)] p-4">
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

      <div className="flex flex-wrap items-center justify-between gap-3">
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

      {isCustom && (
        <div className="rounded-[var(--r)] border border-dashed border-[var(--bd2)] bg-[var(--surf2)] p-8 text-center">
          <p className="text-sm font-semibold text-[var(--text)]">Escolha um período pré-definido</p>
          <p className="mt-2 text-xs leading-5 text-[var(--text2)]">
            O relatório usa Hoje / 7 dias / Este mês / Mês passado / Este ano. O intervalo
            personalizado (com datas) chega numa próxima fase.
          </p>
        </div>
      )}

      {!isCustom && error && (
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

      {!isCustom && loading && (
        <div className="mx-auto h-96 w-full max-w-[820px] animate-pulse rounded-lg bg-[var(--surf2)]" />
      )}

      {/* Pré-visualização WYSIWYG — "folha de papel" branca (mesmo no dark).
          `print:hidden` a tira do fluxo de impressão (só a .cv-print-sheet sai no PDF;
          sem isso a preview invisível inflaria a paginação com páginas em branco). */}
      {!isCustom && !loading && !error && report && (
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
