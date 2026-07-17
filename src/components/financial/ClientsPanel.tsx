"use client";

import { Coins, HelpCircle, Search, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { centsToReaisLabel } from "@/components/CurrencyInput";
import { ErrorState } from "@/components/ErrorState";
import { FinancialTable, type Column } from "@/components/financial/FinancialTable";
import { KpiCard, type KpiState } from "@/components/financial/KpiCard";
import { ChartCard, MiniDonut, type ChartTone } from "@/components/financial/MiniChart";
import { MoneyText } from "@/components/financial/MoneyText";
import type { PeriodKey } from "@/components/financial/PeriodFilter";
import {
  getFinancialClients,
  type ClientRevenueRow,
  type ClientsResponse
} from "@/services/financialClients";

const DONUT_TONES: ChartTone[] = ["teal", "blue", "orange", "danger"];
const UNASSIGNED = "Sem cliente atribuído";

/** Rótulo honesto: vendas sem cliente vinculado (client_name null). */
const clientLabel = (row: ClientRevenueRow) => row.client_name ?? UNASSIGNED;

const COLUMNS: Column<ClientRevenueRow>[] = [
  {
    key: "client",
    label: "Cliente",
    render: (r) =>
      r.client_name ? (
        <span className="font-medium text-[var(--text)]">{r.client_name}</span>
      ) : (
        <span className="italic text-[var(--text3)]">{UNASSIGNED}</span>
      )
  },
  { key: "count", label: "Vendas", align: "right", render: (r) => <span className="font-mono tabular-nums">{r.count}</span> },
  { key: "gross", label: "Comprado", align: "right", render: (r) => <MoneyText cents={r.gross_cents} /> },
  { key: "received", label: "Pago", align: "right", render: (r) => <MoneyText cents={r.received_cents} /> },
  { key: "pending", label: "Pendente", align: "right", render: (r) => <MoneyText cents={r.pending_cents} muted={r.pending_cents === 0} /> },
  { key: "last", label: "Última compra", render: (r) => <span className="font-mono text-[11px] text-[var(--text2)]">{(r.last_purchase_at ?? "").slice(0, 10) || "—"}</span> }
];

export function ClientsPanel({
  period,
  from,
  to
}: {
  period: PeriodKey;
  from?: string;
  to?: string;
}) {
  const [data, setData] = useState<ClientsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    getFinancialClients(period, from, to)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Erro ao carregar os clientes");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, from, to, reload]);

  const s = data?.summary;
  const kpiState: KpiState = error ? "empty" : loading ? "loading" : "ready";

  const kpis = [
    { key: "clients", label: "Clientes com compra", icon: Users, hint: "Clientes distintos no período", num: s?.clients_count },
    { key: "gross", label: "Receita total", icon: TrendingUp, hint: "Soma comprada no período", cents: s?.gross_cents },
    { key: "received", label: "Recebido", icon: Coins, hint: "Dinheiro que entrou", cents: s?.received_cents },
    { key: "unassigned", label: "Sem cliente", icon: HelpCircle, hint: "Vendas sem cliente vinculado", cents: s?.unassigned_gross_cents }
  ];

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  // Donut honesto mesmo com paginação (default 50): o total do centro usa o bruto
  // GLOBAL do summary (não a página), e "Outros" = global − Top-3 exibido, cobrindo
  // também os clientes fora da página. `total` = nº de grupos (inclui 'Sem cliente').
  const grossTotal = s?.gross_cents ?? 0;
  const top = items.slice(0, 3);
  const topSum = top.reduce((sum, it) => sum + it.gross_cents, 0);
  const donutSegments =
    total <= DONUT_TONES.length
      ? items.map((it, i) => ({ label: clientLabel(it), value: it.gross_cents, tone: DONUT_TONES[i % DONUT_TONES.length] }))
      : [
          ...top.map((it, i) => ({ label: clientLabel(it), value: it.gross_cents, tone: DONUT_TONES[i] })),
          { label: "Outros", value: Math.max(0, grossTotal - topSum), tone: DONUT_TONES[3] }
        ];
  const donutTotal = grossTotal;
  const hasDonut = !loading && !error && donutTotal > 0;

  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((it) => clientLabel(it).toLowerCase().includes(q)) : items;
  const tableState = loading ? "loading" : error ? "error" : filtered.length === 0 ? "empty" : "ready";

  const truncated = !loading && !error && total > items.length;

  const toolbar = (
    <div className="relative w-full max-w-xs">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
        size={14}
      />
      <input
        aria-label="Buscar cliente"
        className="cv-input w-full pl-9"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar cliente..."
        type="search"
        value={query}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {error && <ErrorState description={error} title="Não foi possível carregar os clientes" />}

      <div>
        <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Clientes por receita
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, index) => {
            const isCurrency = "cents" in kpi;
            const raw = isCurrency ? kpi.cents : kpi.num;
            const state: KpiState =
              kpiState !== "ready" ? kpiState : raw === null || raw === undefined ? "empty" : "ready";
            return (
              <KpiCard
                format={isCurrency ? "currency" : "integer"}
                hint={kpi.hint}
                icon={kpi.icon}
                index={index}
                key={kpi.key}
                label={kpi.label}
                state={state}
                tone={kpi.key === "unassigned" ? "orange" : isCurrency ? "teal" : "blue"}
                valueCents={isCurrency && typeof raw === "number" ? raw : undefined}
                valueNumber={!isCurrency && typeof raw === "number" ? raw : undefined}
              />
            );
          })}
        </div>
      </div>

      <ChartCard
        description="Participação de cada cliente na receita bruta do período"
        empty={!hasDonut}
        title="Receita por cliente"
      >
        {hasDonut && (
          <MiniDonut
            ariaLabel="Receita por cliente"
            centerLabel={centsToReaisLabel(donutTotal)}
            segments={donutSegments.map((seg) => ({ ...seg }))}
          />
        )}
      </ChartCard>

      <FinancialTable
        columns={COLUMNS}
        emptyDescription="Quando houver vendas no período, a receita por cliente aparece aqui. Vendas sem cliente vinculado são agrupadas em 'Sem cliente atribuído'."
        emptyIcon={<Users aria-hidden="true" size={20} />}
        emptyTitle="Nenhuma venda por cliente no período"
        errorMessage={error ?? undefined}
        onRetry={() => setReload((r) => r + 1)}
        rowKey={(row) => row.client_id ?? "__unassigned__"}
        rows={filtered}
        state={tableState}
        toolbar={toolbar}
      />

      {truncated && (
        <p className="px-1 text-[11px] text-[var(--text3)]">
          Mostrando {items.length} de {total} clientes do período (ordenados por receita).
        </p>
      )}
    </div>
  );
}
