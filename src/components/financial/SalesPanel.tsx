"use client";

import { Clock, Coins, Search, ShoppingCart, Ticket, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { FinancialStatusPill } from "@/components/financial/FinancialStatusPill";
import { FinancialTable, type Column } from "@/components/financial/FinancialTable";
import { KpiCard, type KpiState } from "@/components/financial/KpiCard";
import { MoneyText } from "@/components/financial/MoneyText";
import type { PeriodKey } from "@/components/financial/PeriodFilter";
import { getFinancialSales, type SaleRow, type SalesResponse } from "@/services/financialSales";

const codeCell = (value: string) => (
  <span className="font-mono text-[11px] text-[var(--teal)]">{value}</span>
);

const COLUMNS: Column<SaleRow>[] = [
  { key: "code", label: "Código", render: (r) => codeCell(r.code) },
  {
    key: "client",
    label: "Cliente",
    render: (r) =>
      r.client_name ?? (
        <span className="italic text-[var(--text3)]">Sem cliente atribuído</span>
      )
  },
  { key: "service", label: "Serviço", render: (r) => <span className="text-[var(--text)]">{r.service}</span> },
  { key: "gross", label: "Valor bruto", align: "right", render: (r) => <MoneyText cents={r.gross_cents} /> },
  {
    key: "discount",
    label: "Desconto",
    align: "right",
    render: (r) => <MoneyText cents={r.discount_cents} muted={r.discount_cents === 0} />
  },
  { key: "final", label: "Valor final", align: "right", render: (r) => <MoneyText cents={r.final_cents} /> },
  { key: "status", label: "Status", render: (r) => <FinancialStatusPill status={r.sale_status} /> },
  { key: "payment", label: "Pagamento", render: (r) => <FinancialStatusPill status={r.payment_status} /> },
  { key: "note", label: "Nota", render: (r) => <FinancialStatusPill status={r.note_status} /> }
];

export function SalesPanel({
  period,
  from,
  to
}: {
  period: PeriodKey;
  from?: string;
  to?: string;
}) {
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  // Busca server-side com debounce; qualquer nova busca volta à 1ª página.
  useEffect(() => {
    const t = setTimeout(() => {
      // setState em callback de timeout (não é setState síncrono no effect).
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Troca de período reinicia a paginação (evita pedir página inexistente).
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
    getFinancialSales(period, from, to, page, debouncedQuery)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Erro ao carregar as vendas");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, from, to, page, debouncedQuery, reload]);

  const s = data?.summary;
  const kpiState: KpiState = error ? "empty" : loading ? "loading" : "ready";

  const kpis = [
    { key: "gross", label: "Receita bruta", icon: TrendingUp, hint: "Soma das vendas no período", cents: s?.gross_cents },
    { key: "received", label: "Recebido", icon: Coins, hint: "Dinheiro que entrou (pagamento confirmado)", cents: s?.received_cents },
    { key: "pending", label: "Pendente", icon: Clock, hint: "Vendas ainda não pagas", cents: s?.pending_cents },
    { key: "ticket", label: "Ticket médio", icon: Ticket, hint: "Receita por venda precificada", cents: s?.ticket_cents }
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
        aria-label="Buscar venda por código, serviço ou cliente"
        className="cv-input w-full pl-9"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por código, serviço ou cliente..."
        type="search"
        value={query}
      />
    </div>
  );

  // Rodapé só quando há mais de uma página (senão a paginação seria um controle inerte).
  const footer =
    tableState === "ready" && totalPages > 1 ? (
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-[var(--text3)]">
          Página <span className="font-medium text-[var(--text2)]">{currentPage}</span> de{" "}
          <span className="font-medium text-[var(--text2)]">{totalPages}</span> ·{" "}
          <span className="font-medium text-[var(--text2)]">{total}</span>{" "}
          {total === 1 ? "venda" : "vendas"}
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
      {error && <ErrorState description={error} title="Não foi possível carregar as vendas" />}

      <div>
        <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Vendas do período
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <FinancialTable
        columns={COLUMNS}
        emptyDescription={
          debouncedQuery
            ? "Nenhuma venda corresponde à busca neste período."
            : "Cada pedido registrado (com preço, cliente, serviço, pagamento e nota) aparece aqui. Quando houver vendas no período, elas são listadas venda a venda."
        }
        emptyIcon={<ShoppingCart aria-hidden="true" size={20} />}
        emptyTitle={debouncedQuery ? "Nenhuma venda encontrada" : "Nenhuma venda no período"}
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
