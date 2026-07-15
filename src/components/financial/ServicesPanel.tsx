"use client";

import { Coins, Hash, Layers, Search, Ticket, TrendingUp, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { centsToReaisLabel } from "@/components/CurrencyInput";
import { FinancialTable, type Column } from "@/components/financial/FinancialTable";
import { KpiCard, type KpiState } from "@/components/financial/KpiCard";
import { ChartCard, MiniDonut, type ChartTone } from "@/components/financial/MiniChart";
import { MoneyText } from "@/components/financial/MoneyText";
import type { PeriodKey } from "@/components/financial/PeriodFilter";
import {
  getFinancialServices,
  type ServiceRow,
  type ServicesResponse
} from "@/services/financialServices";

const DONUT_TONES: ChartTone[] = ["teal", "blue", "orange", "danger"];

const COLUMNS: Column<ServiceRow>[] = [
  { key: "service", label: "Serviço", render: (r) => <span className="font-medium text-[var(--text)]">{r.product_label}</span> },
  { key: "count", label: "Qtd.", align: "right", render: (r) => <span className="font-mono tabular-nums">{r.count}</span> },
  { key: "gross", label: "Receita bruta", align: "right", render: (r) => <MoneyText cents={r.gross_cents} /> },
  { key: "received", label: "Recebido", align: "right", render: (r) => <MoneyText cents={r.received_cents} /> },
  { key: "pending", label: "Pendente", align: "right", render: (r) => <MoneyText cents={r.pending_cents} muted={r.pending_cents === 0} /> },
  { key: "ticket", label: "Ticket médio", align: "right", render: (r) => <MoneyText cents={r.ticket_cents} muted={r.ticket_cents === null} /> }
];

export function ServicesPanel({
  period,
  from,
  to
}: {
  period: PeriodKey;
  from?: string;
  to?: string;
}) {
  const [data, setData] = useState<ServicesResponse | null>(null);
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
    getFinancialServices(period, from, to)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Erro ao carregar os serviços");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, from, to, reload]);

  const s = data?.summary;
  const kpiState: KpiState = error ? "empty" : loading ? "loading" : "ready";

  const kpis = [
    { key: "gross", label: "Receita bruta", icon: TrendingUp, hint: "Soma das vendas no período", cents: s?.gross_cents },
    { key: "received", label: "Recebido", icon: Coins, hint: "Dinheiro que entrou", cents: s?.received_cents },
    { key: "ticket", label: "Ticket médio", icon: Ticket, hint: "Receita por venda precificada", cents: s?.ticket_cents },
    { key: "count", label: "Serviços distintos", icon: Layers, hint: "Tipos de serviço vendidos", num: s?.services_count }
  ];

  // Donut "receita por serviço": Top-3 + "Outros" (paleta de 4 tons).
  const byProduct = s?.by_product ?? [];
  const donutSegments =
    byProduct.length <= DONUT_TONES.length
      ? byProduct.map((p, i) => ({ label: p.product_label, value: p.gross_cents, tone: DONUT_TONES[i % DONUT_TONES.length] }))
      : [
          ...byProduct.slice(0, 3).map((p, i) => ({ label: p.product_label, value: p.gross_cents, tone: DONUT_TONES[i] })),
          { label: "Outros", value: byProduct.slice(3).reduce((sum, p) => sum + p.gross_cents, 0), tone: DONUT_TONES[3] }
        ];
  const donutTotal = donutSegments.reduce((sum, seg) => sum + seg.value, 0);
  const hasDonut = !loading && !error && donutTotal > 0;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? byProduct.filter((it) => `${it.product_label} ${it.product_type}`.toLowerCase().includes(q))
    : byProduct;
  const tableState = loading ? "loading" : error ? "error" : filtered.length === 0 ? "empty" : "ready";

  const toolbar = (
    <div className="relative w-full max-w-xs">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
        size={14}
      />
      <input
        aria-label="Buscar serviço"
        className="cv-input w-full pl-9"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar serviço..."
        type="search"
        value={query}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div
          className="flex items-start gap-3 rounded-[var(--r)] border border-[rgba(239,68,68,0.28)] bg-[var(--danger-dim)] p-4"
          role="alert"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--danger)]" size={16} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">Não foi possível carregar os serviços</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text2)]">{error}</p>
          </div>
        </div>
      )}

      <div>
        <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Serviços vendidos
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
                tone={isCurrency ? "teal" : "blue"}
                valueCents={isCurrency && typeof raw === "number" ? raw : undefined}
                valueNumber={!isCurrency && typeof raw === "number" ? raw : undefined}
              />
            );
          })}
        </div>
      </div>

      <ChartCard
        description="Participação de cada serviço na receita bruta do período"
        empty={!hasDonut}
        title="Receita por serviço"
      >
        {hasDonut && (
          <MiniDonut
            ariaLabel="Receita por serviço"
            centerLabel={centsToReaisLabel(donutTotal)}
            segments={donutSegments.map((seg) => ({ ...seg }))}
          />
        )}
      </ChartCard>

      <FinancialTable
        columns={COLUMNS}
        emptyDescription="Quando houver vendas no período, cada serviço (por tipo de produto) aparece aqui com receita, recebido, pendente e ticket médio."
        emptyIcon={<Layers aria-hidden="true" size={20} />}
        emptyTitle="Nenhum serviço vendido no período"
        errorMessage={error ?? undefined}
        onRetry={() => setReload((r) => r + 1)}
        rowKey={(row) => row.product_type}
        rows={filtered}
        state={tableState}
        toolbar={toolbar}
      />
    </div>
  );
}
