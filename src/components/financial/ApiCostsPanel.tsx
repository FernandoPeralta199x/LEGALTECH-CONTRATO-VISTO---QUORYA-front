"use client";

import {
  Calculator,
  Hash,
  Info,
  Plug,
  Plus,
  Search,
  TrendingUp,
  TriangleAlert,
  type LucideIcon
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { centsToReaisLabel } from "@/components/CurrencyInput";
import { ApiCostFormModal } from "@/components/financial/ApiCostFormModal";
import {
  FinancialStatusPill,
  type FinancialStatus
} from "@/components/financial/FinancialStatusPill";
import { FinancialTable, type Column } from "@/components/financial/FinancialTable";
import { KpiCard, type KpiState, type KpiTone } from "@/components/financial/KpiCard";
import { ChartCard, MiniDonut, type ChartTone } from "@/components/financial/MiniChart";
import { MoneyText } from "@/components/financial/MoneyText";
import type { PeriodKey } from "@/components/financial/PeriodFilter";
import { cn } from "@/lib/cn";
import {
  createApiCost,
  listApiCosts,
  type ApiCostItem,
  type ApiCostsResponse,
  type AutoApiProvider,
  type CreateApiCostPayload
} from "@/services/apiCosts";

const DONUT_TONES: ChartTone[] = ["teal", "blue", "orange", "danger"];

const COLUMNS: Column<ApiCostItem>[] = [
  { key: "provider", label: "Provedor", render: (r) => <span className="font-mono text-[11px] text-[var(--teal)]">{r.provider}</span> },
  { key: "operation", label: "Serviço", render: (r) => r.operation },
  { key: "quantity", label: "Qtd.", align: "right", render: (r) => <span className="font-mono tabular-nums">{r.quantity}</span> },
  { key: "unit", label: "Custo unit.", align: "right", render: (r) => <MoneyText cents={r.unit_cost_cents} /> },
  { key: "total", label: "Custo total", align: "right", render: (r) => <MoneyText cents={r.total_cost_cents} /> },
  { key: "status", label: "Status", render: (r) => <FinancialStatusPill status={r.status as FinancialStatus} /> },
  { key: "date", label: "Data", render: (r) => <span className="font-mono text-[11px] text-[var(--text2)]">{(r.incurred_at ?? "").slice(0, 10) || "—"}</span> }
];

const AUTO_COLUMNS: Column<AutoApiProvider>[] = [
  { key: "prov", label: "Provedor", render: (r) => <span className="font-medium text-[var(--text)]">{r.provider_label}</span> },
  { key: "qty", label: "Consultas", align: "right", render: (r) => <span className="font-mono tabular-nums">{r.quantity}</span> },
  { key: "unit", label: "Custo/consulta", align: "right", render: (r) => <MoneyText cents={r.unit_cost_cents} /> },
  { key: "total", label: "Total", align: "right", render: (r) => <MoneyText cents={r.total_cents} muted={r.total_cents === 0} /> }
];

type Kpi = {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: KpiTone;
  format: "currency" | "integer";
  hint: string;
  value: number | null | undefined;
};

export function ApiCostsPanel({
  period,
  from,
  to
}: {
  period: PeriodKey;
  from?: string;
  to?: string;
}) {
  const [data, setData] = useState<ApiCostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    listApiCosts(period, from, to)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Erro ao carregar os custos de API");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, from, to, reload]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleCreate(payload: CreateApiCostPayload) {
    setSubmitting(true);
    try {
      await createApiCost(payload);
      setModalOpen(false);
      setToast({ text: "Gasto de API registrado.", type: "success" });
      setReload((r) => r + 1);
    } catch (err: unknown) {
      setToast({
        text: err instanceof Error ? err.message : "Não foi possível registrar o gasto.",
        type: "error"
      });
    } finally {
      setSubmitting(false);
    }
  }

  const summary = data?.summary;
  const auto = data?.automatic;
  const kpiState: KpiState = error ? "empty" : loading ? "loading" : "ready";

  const kpis: Kpi[] = [
    { key: "total", label: "Custo lançado manualmente", icon: Plug, tone: "orange", format: "currency", hint: "Soma dos lançamentos manuais processados — não inclui a estimativa do uso real (bloco acima).", value: summary?.api_cost_cents },
    { key: "forecast", label: "Custo previsto", icon: TrendingUp, tone: "orange", format: "currency", hint: "Estimativas ainda não processadas", value: summary?.api_cost_forecast_cents },
    { key: "count", label: "Registros de custo", icon: Hash, tone: "blue", format: "integer", hint: "Lançamentos no período", value: summary?.api_cost_count },
    { key: "avg", label: "Custo médio / registro", icon: Calculator, tone: "blue", format: "currency", hint: "Custo total dividido pelos registros", value: summary && summary.api_cost_count > 0 ? Math.round(summary.api_cost_cents / summary.api_cost_count) : null }
  ];

  // Donut "custo por provedor": Top-3 + "Outros" (paleta tem 4 tons).
  const byProvider = summary?.by_provider ?? [];
  const donutSegments = (byProvider.length <= DONUT_TONES.length
    ? byProvider.map((p, i) => ({ label: p.provider, value: p.total_cents, tone: DONUT_TONES[i % DONUT_TONES.length] }))
    : [
        ...byProvider.slice(0, 3).map((p, i) => ({ label: p.provider, value: p.total_cents, tone: DONUT_TONES[i] })),
        { label: "Outros", value: byProvider.slice(3).reduce((s, p) => s + p.total_cents, 0), tone: DONUT_TONES[3] }
      ]);
  const donutTotal = donutSegments.reduce((s, seg) => s + seg.value, 0);
  const hasDonut = !loading && !error && donutTotal > 0;

  const items = data?.items ?? [];
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((it) => `${it.provider} ${it.operation}`.toLowerCase().includes(q))
    : items;
  const tableState = loading ? "loading" : error ? "error" : filtered.length === 0 ? "empty" : "ready";

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-xs">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
          size={14}
        />
        <input
          aria-label="Buscar por provedor ou serviço"
          className="cv-input w-full pl-9"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar provedor ou serviço..."
          type="search"
          value={query}
        />
      </div>
      <Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)} size="sm" variant="primary">
        Novo gasto
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-[var(--r)] border p-4",
            toast.type === "success"
              ? "border-[rgba(32,201,151,0.28)] bg-[var(--teal-dim)]"
              : "border-[rgba(239,68,68,0.28)] bg-[var(--danger-dim)]"
          )}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <p className="text-sm text-[var(--text)]">{toast.text}</p>
        </div>
      )}

      {error && (
        <div
          className="flex items-start gap-3 rounded-[var(--r)] border border-[rgba(239,68,68,0.28)] bg-[var(--danger-dim)] p-4"
          role="alert"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--danger)]" size={16} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">Não foi possível carregar os custos de API</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text2)]">{error}</p>
          </div>
        </div>
      )}

      {auto && !loading && !error && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-[var(--r)] border border-[rgba(96,165,250,0.22)] bg-[var(--blue-dim)] p-4">
            <Info aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--blue)]" size={16} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text)]">Gastos com APIs — automático (do uso real)</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text2)]">{auto.disclaimer}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
              Estimativa do período
            </p>
            <p className="text-sm text-[var(--text2)]">
              <span className="text-lg font-semibold text-[var(--text)]">{centsToReaisLabel(auto.total_cents)}</span>{" "}
              <span className="text-[var(--text3)]">· {auto.calls} consulta(s)</span>
            </p>
          </div>
          <FinancialTable
            columns={AUTO_COLUMNS}
            emptyDescription="Quando a triagem executar consultas (Escavador, TargetData, Serasa, Procon), o custo estimado aparece aqui automaticamente."
            emptyIcon={<Plug aria-hidden="true" size={20} />}
            emptyTitle="Nenhuma consulta de API no período"
            rowKey={(r) => r.provider}
            rows={auto.by_provider}
            state="ready"
          />
        </div>
      )}

      <div>
        <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Lançamentos manuais
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, index) => {
            const raw = kpi.value;
            const state: KpiState =
              kpiState !== "ready" ? kpiState : raw === null || raw === undefined ? "empty" : "ready";
            return (
              <KpiCard
                format={kpi.format}
                hint={kpi.hint}
                icon={kpi.icon}
                index={index}
                key={kpi.key}
                label={kpi.label}
                state={state}
                tone={kpi.tone}
                valueCents={kpi.format === "currency" && typeof raw === "number" ? raw : undefined}
                valueNumber={kpi.format === "integer" && typeof raw === "number" ? raw : undefined}
              />
            );
          })}
        </div>
      </div>

      <ChartCard
        description="Participação de cada provedor no custo processado do período"
        empty={!hasDonut}
        title="Custo por provedor"
      >
        {hasDonut && (
          <MiniDonut
            ariaLabel="Custo por provedor"
            centerLabel={centsToReaisLabel(donutTotal)}
            segments={donutSegments.map((s) => ({ ...s }))}
          />
        )}
      </ChartCard>

      <FinancialTable
        columns={COLUMNS}
        emptyDescription="Registre custos de consultas (CPF/CNPJ, processual, Serasa), OCR, IA/LLM, e-mail e afins para acompanhar o custo por provedor e a margem operacional."
        emptyIcon={<Plug aria-hidden="true" size={20} />}
        emptyTitle="Nenhum gasto de API no período"
        errorMessage={error ?? undefined}
        onRetry={() => setReload((r) => r + 1)}
        rowKey={(row) => row.id}
        rows={filtered}
        state={tableState}
        toolbar={toolbar}
      />

      <ApiCostFormModal
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        open={modalOpen}
        submitting={submitting}
      />
    </div>
  );
}
