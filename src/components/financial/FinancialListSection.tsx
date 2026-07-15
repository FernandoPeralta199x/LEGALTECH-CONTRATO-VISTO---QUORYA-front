"use client";

import { Plus, Search, TriangleAlert, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/Button";
import { FinancialTable, type Column } from "@/components/financial/FinancialTable";
import { KpiCard, type KpiState, type KpiTone } from "@/components/financial/KpiCard";
import { ChartCard, MiniDonut, type ChartTone } from "@/components/financial/MiniChart";
import { cn } from "@/lib/cn";

export type SectionKpi = {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: KpiTone;
  format: "currency" | "integer";
  hint: string;
  value: number | null | undefined;
};

export type DonutConfig = {
  title: string;
  description: string;
  centerLabel: string;
  segments: { label: string; value: number; tone: ChartTone }[];
};

type SectionData<Item, Summary> = { summary: Summary; items: Item[]; total: number };

/** Seção CRUD financeira genérica (Tributos/Notas): fetch por período + reload,
 *  KPIs, donut, tabela com busca + botão "Registrar", modal e toast. Espelha a
 *  espinha do ApiCostsPanel para evitar duplicação entre as duas seções. */
export function FinancialListSection<Item, Summary, Payload>({
  period,
  eyebrow,
  fetcher,
  creator,
  buildKpis,
  buildDonut,
  columns,
  rowKey,
  searchText,
  searchPlaceholder,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  newLabel,
  successText,
  renderModal
}: {
  period: string;
  eyebrow: string;
  fetcher: (period: string) => Promise<SectionData<Item, Summary>>;
  creator: (payload: Payload) => Promise<unknown>;
  buildKpis: (summary: Summary | undefined) => SectionKpi[];
  buildDonut: (summary: Summary | undefined) => DonutConfig | null;
  columns: Column<Item>[];
  rowKey: (item: Item) => string;
  searchText: (item: Item) => string;
  searchPlaceholder: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  newLabel: string;
  successText: string;
  renderModal: (p: {
    open: boolean;
    onClose: () => void;
    onSubmit: (payload: Payload) => Promise<void>;
    submitting: boolean;
  }) => ReactNode;
}) {
  const [data, setData] = useState<SectionData<Item, Summary> | null>(null);
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
    fetcher(period)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Erro ao carregar os dados");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, reload, fetcher]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleCreate(payload: Payload) {
    setSubmitting(true);
    try {
      await creator(payload);
      setModalOpen(false);
      setToast({ text: successText, type: "success" });
      setReload((r) => r + 1);
    } catch (err: unknown) {
      setToast({
        text: err instanceof Error ? err.message : "Não foi possível registrar.",
        type: "error"
      });
    } finally {
      setSubmitting(false);
    }
  }

  const summary = data?.summary;
  const kpiState: KpiState = error ? "empty" : loading ? "loading" : "ready";
  const kpis = buildKpis(summary);
  const donut = buildDonut(summary);
  const donutTotal = donut ? donut.segments.reduce((s, seg) => s + seg.value, 0) : 0;
  const hasDonut = !loading && !error && donut !== null && donutTotal > 0;

  const items = data?.items ?? [];
  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((it) => searchText(it).toLowerCase().includes(q)) : items;
  const tableState = loading ? "loading" : error ? "error" : filtered.length === 0 ? "empty" : "ready";

  const EmptyIcon = emptyIcon;

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-xs">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
          size={14}
        />
        <input
          aria-label={searchPlaceholder}
          className="cv-input w-full pl-9"
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          type="search"
          value={query}
        />
      </div>
      <Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)} size="sm" variant="primary">
        {newLabel}
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
            <p className="text-sm font-semibold text-[var(--text)]">Não foi possível carregar</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text2)]">{error}</p>
          </div>
        </div>
      )}

      <div>
        <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          {eyebrow}
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

      {donut && (
        <ChartCard description={donut.description} empty={!hasDonut} title={donut.title}>
          {hasDonut && (
            <MiniDonut
              ariaLabel={donut.title}
              centerLabel={donut.centerLabel}
              segments={donut.segments.map((s) => ({ ...s }))}
            />
          )}
        </ChartCard>
      )}

      <FinancialTable
        columns={columns}
        emptyDescription={emptyDescription}
        emptyIcon={<EmptyIcon aria-hidden="true" size={20} />}
        emptyTitle={emptyTitle}
        errorMessage={error ?? undefined}
        onRetry={() => setReload((r) => r + 1)}
        rowKey={rowKey}
        rows={filtered}
        state={tableState}
        toolbar={toolbar}
      />

      {renderModal({
        open: modalOpen,
        onClose: () => setModalOpen(false),
        onSubmit: handleCreate,
        submitting
      })}
    </div>
  );
}
