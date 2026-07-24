"use client";

import { CalendarClock, Search, TriangleAlert, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { FinancialStatusPill } from "@/components/financial/FinancialStatusPill";
import { FinancialTable, type Column } from "@/components/financial/FinancialTable";
import { KpiCard, type KpiState } from "@/components/financial/KpiCard";
import { MoneyText } from "@/components/financial/MoneyText";
import type { PeriodKey } from "@/components/financial/PeriodFilter";
import {
  getFinancialReceivables,
  type ReceivableRow,
  type ReceivablesResponse
} from "@/services/financialReceivables";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  // due_date vem como 'YYYY-MM-DD' (date puro) — evita shift de fuso ao formatar.
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

const COLUMNS: Column<ReceivableRow>[] = [
  {
    key: "client",
    label: "Cliente",
    render: (r) =>
      r.client_name ?? <span className="italic text-[var(--text3)]">Sem cliente atribuído</span>
  },
  { key: "sale", label: "Venda", render: (r) => <span className="font-mono text-[11px] text-[var(--teal)]">{r.code}</span> },
  { key: "amount", label: "Valor a receber", align: "right", render: (r) => <MoneyText cents={r.amount_cents} /> },
  { key: "due", label: "Vencimento", render: (r) => <span className="font-mono text-[11px] text-[var(--text2)]">{formatDate(r.due_date)}</span> },
  {
    key: "overdue",
    label: "Dias em atraso",
    align: "right",
    render: (r) =>
      r.days_overdue > 0 ? (
        <span className="font-mono tabular-nums font-medium text-[var(--danger)]">{r.days_overdue}</span>
      ) : (
        <span className="text-[var(--text3)]">—</span>
      )
  },
  { key: "status", label: "Status", render: (r) => <FinancialStatusPill status={r.status} /> }
];

export function ReceivablesPanel({
  period,
  from,
  to
}: {
  period: PeriodKey;
  from?: string;
  to?: string;
}) {
  const [data, setData] = useState<ReceivablesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset de página no filtro.
    setPage(1);
  }, [period, from, to]);

  useEffect(() => {
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    getFinancialReceivables(period, from, to, page, debouncedQuery)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Erro ao carregar os recebíveis");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, from, to, page, debouncedQuery, reload]);

  const s = data?.summary;
  const kpiState: KpiState = error ? "empty" : loading ? "loading" : "ready";

  const kpis = [
    { key: "total", label: "Total a receber", icon: Wallet, tone: "teal" as const, hint: "Vendas pendentes no período", cents: s?.total_cents },
    { key: "overdue", label: "Em atraso", icon: TriangleAlert, tone: "danger" as const, hint: "Recebíveis com vencimento já passado", cents: s?.overdue_cents },
    { key: "due", label: "A vencer", icon: CalendarClock, tone: "orange" as const, hint: "Recebíveis ainda dentro do prazo", cents: s?.due_cents }
  ];

  const rows = data?.items ?? [];
  const tableState = loading ? "loading" : error ? "error" : rows.length === 0 ? "empty" : "ready";
  const totalPages = data?.total_pages ?? 0;
  const currentPage = data?.page ?? page;
  const total = data?.total ?? 0;
  const termDays = data?.payment_term_days ?? 30;

  const toolbar = (
    <div className="relative w-full max-w-xs">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
        size={14}
      />
      <input
        aria-label="Buscar recebível por venda ou cliente"
        className="cv-input w-full pl-9"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por venda ou cliente..."
        type="search"
        value={query}
      />
    </div>
  );

  const footer =
    tableState === "ready" && totalPages > 1 ? (
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-[var(--text3)]">
          Página <span className="font-medium text-[var(--text2)]">{currentPage}</span> de{" "}
          <span className="font-medium text-[var(--text2)]">{totalPages}</span> ·{" "}
          <span className="font-medium text-[var(--text2)]">{total}</span>{" "}
          {total === 1 ? "recebível" : "recebíveis"}
        </span>
        <div className="flex items-center gap-2">
          <Button disabled={currentPage <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} size="sm" variant="secondary">
            Anterior
          </Button>
          <Button disabled={currentPage >= totalPages || loading} onClick={() => setPage((p) => p + 1)} size="sm" variant="secondary">
            Próxima
          </Button>
        </div>
      </div>
    ) : undefined;

  return (
    <div className="space-y-6">
      {error && <ErrorState description={error} title="Não foi possível carregar os recebíveis" />}

      <div>
        <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Recebíveis do período
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi, index) => {
            const raw = kpi.cents;
            const state: KpiState =
              kpiState !== "ready" ? kpiState : raw === null || raw === undefined ? "empty" : "ready";
            return (
              <KpiCard
                format="currency"
                hint={kpi.hint}
                icon={kpi.icon}
                index={index}
                key={kpi.key}
                label={kpi.label}
                state={state}
                tone={kpi.tone}
                valueCents={typeof raw === "number" ? raw : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Nota honesta: vencimento é derivado do prazo da organização, não de um cronograma real. */}
      <p className="flex items-center gap-2 px-1 text-[11px] text-[var(--text3)]">
        <CalendarClock aria-hidden="true" size={12} />
        Recebível = venda pendente. Vencimento = data da venda + {termDays} dias (prazo da organização); em atraso quando já venceu.
      </p>

      <FinancialTable
        columns={COLUMNS}
        emptyDescription={
          debouncedQuery
            ? "Nenhum recebível corresponde à busca neste período."
            : "As vendas ainda não pagas aparecem aqui, com vencimento e dias em atraso. Sem vendas pendentes no período, nada a receber."
        }
        emptyIcon={<CalendarClock aria-hidden="true" size={20} />}
        emptyTitle={debouncedQuery ? "Nenhum recebível encontrado" : "Nada a receber no período"}
        errorMessage={error ?? undefined}
        footer={footer}
        onRetry={() => setReload((r) => r + 1)}
        rowKey={(row) => row.id}
        rows={rows}
        state={tableState}
        toolbar={toolbar}
      />
    </div>
  );
}
