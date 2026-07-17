"use client";

import { Banknote, Coins, CreditCard, Search, Ticket } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { FinancialStatusPill } from "@/components/financial/FinancialStatusPill";
import { FinancialTable, type Column } from "@/components/financial/FinancialTable";
import { KpiCard, type KpiState } from "@/components/financial/KpiCard";
import { MoneyText } from "@/components/financial/MoneyText";
import type { PeriodKey } from "@/components/financial/PeriodFilter";
import {
  getFinancialPayments,
  type PaymentRow,
  type PaymentsResponse
} from "@/services/financialPayments";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

const idCell = (value: string) => (
  <span className="font-mono text-[11px] text-[var(--text2)]" title={value}>
    {value.length > 18 ? `${value.slice(0, 18)}…` : value}
  </span>
);

const COLUMNS: Column<PaymentRow>[] = [
  { key: "id", label: "ID", render: (r) => idCell(r.id) },
  { key: "sale", label: "Venda", render: (r) => <span className="font-mono text-[11px] text-[var(--teal)]">{r.code}</span> },
  {
    key: "client",
    label: "Cliente",
    render: (r) =>
      r.client_name ?? <span className="italic text-[var(--text3)]">Sem cliente atribuído</span>
  },
  {
    key: "method",
    label: "Método",
    render: (r) => (
      <span className="text-[var(--text)]">
        {r.method_label}
        {r.installments > 1 && <span className="text-[var(--text3)]"> · {r.installments}x</span>}
      </span>
    )
  },
  { key: "amount", label: "Valor", align: "right", render: (r) => <MoneyText cents={r.amount_cents} /> },
  { key: "fee", label: "Taxa gateway", align: "right", render: (r) => <MoneyText cents={r.fee_cents} muted={r.fee_cents === 0} /> },
  { key: "net", label: "Líquido", align: "right", render: (r) => <MoneyText cents={r.net_cents} /> },
  { key: "status", label: "Status", render: (r) => <FinancialStatusPill status={r.payment_status} /> },
  { key: "date", label: "Data", render: (r) => <span className="font-mono text-[11px] text-[var(--text2)]">{formatDate(r.paid_at)}</span> }
];

export function PaymentsPanel({
  period,
  from,
  to
}: {
  period: PeriodKey;
  from?: string;
  to?: string;
}) {
  const [data, setData] = useState<PaymentsResponse | null>(null);
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
    getFinancialPayments(period, from, to, page, debouncedQuery)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Erro ao carregar os pagamentos");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, from, to, page, debouncedQuery, reload]);

  const s = data?.summary;
  const kpiState: KpiState = error ? "empty" : loading ? "loading" : "ready";

  const kpis = [
    { key: "total", label: "Total processado", icon: Banknote, hint: "Soma dos valores cobrados no período", cents: s?.total_cents },
    { key: "received", label: "Recebido", icon: Coins, hint: "Pagamentos confirmados — valor cobrado (com juros) que entrou de fato", cents: s?.received_cents },
    { key: "average", label: "Ticket médio", icon: Ticket, hint: "Valor médio por pagamento", cents: s?.average_cents }
  ];

  const rows = data?.items ?? [];
  const tableState = loading ? "loading" : error ? "error" : rows.length === 0 ? "empty" : "ready";
  const totalPages = data?.total_pages ?? 0;
  const currentPage = data?.page ?? page;
  const total = data?.total ?? 0;

  const toolbar = (
    <div className="relative w-full max-w-xs">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
        size={14}
      />
      <input
        aria-label="Buscar pagamento por venda, cliente ou método"
        className="cv-input w-full pl-9"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por venda, cliente ou método..."
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
          {total === 1 ? "pagamento" : "pagamentos"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            disabled={currentPage <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            size="sm"
            variant="secondary"
          >
            Anterior
          </Button>
          <Button
            disabled={currentPage >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            size="sm"
            variant="secondary"
          >
            Próxima
          </Button>
        </div>
      </div>
    ) : undefined;

  return (
    <div className="space-y-6">
      {error && <ErrorState description={error} title="Não foi possível carregar os pagamentos" />}

      <div>
        <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Pagamentos do período
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
                tone="teal"
                valueCents={typeof raw === "number" ? raw : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Nota honesta: sem gateway real nesta fase (taxa = R$ 0,00, líquido = valor). */}
      <p className="flex items-center gap-2 px-1 text-[11px] text-[var(--text3)]">
        <CreditCard aria-hidden="true" size={12} />
        Valor = cobrado (com juros). Sem gateway real nesta fase: taxa R$ 0,00 e líquido = valor.
      </p>

      <FinancialTable
        columns={COLUMNS}
        emptyDescription={
          debouncedQuery
            ? "Nenhum pagamento corresponde à busca neste período."
            : "Cada cobrança registrada (método, valor, parcelas, status e data) aparece aqui. Quando houver pagamentos no período, eles são listados pagamento a pagamento."
        }
        emptyIcon={<CreditCard aria-hidden="true" size={20} />}
        emptyTitle={debouncedQuery ? "Nenhum pagamento encontrado" : "Nenhum pagamento no período"}
        errorMessage={error ?? undefined}
        footer={footer}
        onRetry={() => setReload((r) => r + 1)}
        rowKey={(row) => row.request_id}
        rows={rows}
        state={tableState}
        toolbar={toolbar}
      />
    </div>
  );
}
