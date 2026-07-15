"use client";

import {
  Ban,
  Banknote,
  Calculator,
  CalendarClock,
  Clock,
  CreditCard,
  FileText,
  History,
  Info,
  Landmark,
  LayoutDashboard,
  Package,
  Percent,
  Plug,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  TrendingUp,
  TriangleAlert,
  UsersRound,
  Wallet,
  type LucideIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { AdminGuard } from "@/components/AdminGuard";
import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { EmptyState } from "@/components/EmptyState";
import { PageTitle } from "@/components/PageTitle";
import { ApiCostsPanel } from "@/components/financial/ApiCostsPanel";
import { ReportsPanel } from "@/components/financial/ReportsPanel";
import { TaxesNotesPanel } from "@/components/financial/TaxesNotesPanel";
import { FinancialStatusPill, type FinancialStatus } from "@/components/financial/FinancialStatusPill";
import { FinancialTable, type Column } from "@/components/financial/FinancialTable";
import { KpiCard, type KpiState, type KpiTone } from "@/components/financial/KpiCard";
import { ChartCard, StackedBar } from "@/components/financial/MiniChart";
import { MoneyText } from "@/components/financial/MoneyText";
import { PeriodFilter, periodLabel, type PeriodKey } from "@/components/financial/PeriodFilter";
import {
  getFinancialOverview,
  type FinancialOverview,
  type FinancialOverviewKpis
} from "@/services/financial";

/* ── Abas internas (ABA_FINANCEIRO_ROBUSTO). Padrão ARIA Tabs espelhado de
 * cases/[id] (A11Y-05). Visão Geral abre por padrão. Fase 2: componentes
 * visuais reais (KPIs, tabelas, gráficos) em estados vazios honestos — nenhum
 * dado é inventado até o backend financeiro existir (Fase 3+). */
type TabId =
  | "overview"
  | "sales"
  | "payments"
  | "receivables"
  | "refunds"
  | "clients"
  | "services"
  | "api-costs"
  | "taxes"
  | "reports"
  | "audit"
  | "settings";

type Tab = { id: TabId; label: string; icon: LucideIcon };

const TABS: Tab[] = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "sales", label: "Vendas", icon: ShoppingCart },
  { id: "payments", label: "Pagamentos", icon: CreditCard },
  { id: "receivables", label: "Recebíveis", icon: CalendarClock },
  { id: "refunds", label: "Reembolsos", icon: RotateCcw },
  { id: "clients", label: "Clientes", icon: UsersRound },
  { id: "services", label: "Serviços", icon: Package },
  { id: "api-costs", label: "Gastos com APIs", icon: Plug },
  { id: "taxes", label: "Tributos e Notas", icon: Landmark },
  { id: "reports", label: "Relatórios / PDF", icon: FileText },
  { id: "audit", label: "Auditoria", icon: History },
  { id: "settings", label: "Configurações", icon: Settings }
];

const TAB_IDS = TABS.map((t) => t.id);

function isTabId(value: string): value is TabId {
  return (TAB_IDS as string[]).includes(value);
}

/* ── KPIs executivos da Visão Geral ────────────────────────────────────────── */
type OverviewKpi = {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: KpiTone;
  format: "currency" | "integer";
  hint: string;
  /** Campo correspondente no payload do backend (GET /financial/overview). */
  field: keyof FinancialOverviewKpis;
};

// Agrupados por significado (resolve o "13º card órfão" e ajuda a leitura).
const KPI_GROUPS: { label: string; kpis: OverviewKpi[] }[] = [
  {
    label: "Resultado",
    kpis: [
      { key: "gross", field: "gross_cents", label: "Receita bruta", icon: TrendingUp, tone: "teal", format: "currency", hint: "Vendas antes de descontos e taxas" },
      { key: "net", field: "net_cents", label: "Receita líquida", icon: Wallet, tone: "teal", format: "currency", hint: "Após descontos, taxas, custos e tributos" },
      { key: "margin", field: "margin_cents", label: "Margem estimada", icon: Percent, tone: "teal", format: "currency", hint: "Receita líquida menos custos diretos" },
      { key: "ticket", field: "ticket_cents", label: "Ticket médio", icon: Calculator, tone: "blue", format: "currency", hint: "Receita dividida por vendas válidas" }
    ]
  },
  {
    label: "Recebimentos",
    kpis: [
      { key: "received", field: "received_cents", label: "Total recebido", icon: Banknote, tone: "teal", format: "currency", hint: "Dinheiro que entrou de fato" },
      { key: "pending", field: "pending_cents", label: "Total pendente", icon: Clock, tone: "orange", format: "currency", hint: "Vendas ainda não pagas" },
      { key: "overdue", field: "overdue_cents", label: "Total em atraso", icon: TriangleAlert, tone: "danger", format: "currency", hint: "Pendente com vencimento vencido" },
      { key: "canceled", field: "canceled_cents", label: "Total cancelado", icon: Ban, tone: "danger", format: "currency", hint: "Vendas canceladas no período" },
      { key: "refunded", field: "refunded_cents", label: "Total reembolsado", icon: RotateCcw, tone: "danger", format: "currency", hint: "Valores devolvidos ao cliente" }
    ]
  },
  {
    label: "Operação e fiscal",
    kpis: [
      { key: "count", field: "count", label: "Quantidade de vendas", icon: ShoppingCart, tone: "blue", format: "integer", hint: "Vendas registradas no período" },
      { key: "api-cost", field: "api_cost_cents", label: "Gastos com APIs", icon: Plug, tone: "orange", format: "currency", hint: "Custos de integrações externas" },
      { key: "tax", field: "tax_cents", label: "Tributos provisionados", icon: Landmark, tone: "orange", format: "currency", hint: "Estimativa de tributos incidentes" },
      { key: "invoices", field: "invoices_count", label: "Notas emitidas", icon: Receipt, tone: "blue", format: "integer", hint: "Documentos fiscais autorizados" }
    ]
  }
];

/* ── Colunas das tabelas (estrutura real; dados só na Fase 3) ───────────────── */
const codeCell = (value: string) => (
  <span className="font-mono text-[11px] text-[var(--teal)]">{value}</span>
);
const dateCell = (value: string) => (
  <span className="font-mono text-[11px] text-[var(--text2)]">{value}</span>
);

type SaleRow = {
  code: string;
  client: string;
  service: string;
  grossCents: number;
  discountCents: number;
  finalCents: number;
  status: FinancialStatus;
  paymentStatus: FinancialStatus;
  noteStatus: FinancialStatus;
};

const SALE_COLUMNS: Column<SaleRow>[] = [
  { key: "code", label: "Código", render: (r) => codeCell(r.code) },
  { key: "client", label: "Cliente", render: (r) => r.client },
  { key: "service", label: "Serviço", render: (r) => r.service },
  { key: "gross", label: "Valor bruto", align: "right", render: (r) => <MoneyText cents={r.grossCents} /> },
  { key: "discount", label: "Desconto", align: "right", render: (r) => <MoneyText cents={r.discountCents} /> },
  { key: "final", label: "Valor final", align: "right", render: (r) => <MoneyText cents={r.finalCents} /> },
  { key: "status", label: "Status", render: (r) => <FinancialStatusPill status={r.status} /> },
  { key: "payment", label: "Pagamento", render: (r) => <FinancialStatusPill status={r.paymentStatus} /> },
  { key: "note", label: "Nota", render: (r) => <FinancialStatusPill status={r.noteStatus} /> }
];

type PaymentRow = {
  id: string;
  sale: string;
  client: string;
  method: string;
  amountCents: number;
  feeCents: number;
  netCents: number;
  status: FinancialStatus;
  date: string;
};

const PAYMENT_COLUMNS: Column<PaymentRow>[] = [
  { key: "id", label: "ID", render: (r) => codeCell(r.id) },
  { key: "sale", label: "Venda", render: (r) => r.sale },
  { key: "client", label: "Cliente", render: (r) => r.client },
  { key: "method", label: "Método", render: (r) => r.method },
  { key: "amount", label: "Valor", align: "right", render: (r) => <MoneyText cents={r.amountCents} /> },
  { key: "fee", label: "Taxa gateway", align: "right", render: (r) => <MoneyText cents={r.feeCents} /> },
  { key: "net", label: "Líquido", align: "right", render: (r) => <MoneyText cents={r.netCents} /> },
  { key: "status", label: "Status", render: (r) => <FinancialStatusPill status={r.status} /> },
  { key: "date", label: "Data", render: (r) => dateCell(r.date) }
];

type ReceivableRow = {
  client: string;
  sale: string;
  amountCents: number;
  dueDate: string;
  daysOverdue: number;
  status: FinancialStatus;
};

const RECEIVABLE_COLUMNS: Column<ReceivableRow>[] = [
  { key: "client", label: "Cliente", render: (r) => r.client },
  { key: "sale", label: "Venda", render: (r) => r.sale },
  { key: "amount", label: "Valor a receber", align: "right", render: (r) => <MoneyText cents={r.amountCents} /> },
  { key: "due", label: "Vencimento", render: (r) => dateCell(r.dueDate) },
  { key: "overdue", label: "Dias em atraso", align: "right", render: (r) => <span className="font-mono tabular-nums">{r.daysOverdue}</span> },
  { key: "status", label: "Status", render: (r) => <FinancialStatusPill status={r.status} /> }
];

/* ── Estado vazio honesto das abas ainda sem estrutura de tabela ────────────── */
type EmptyTab = { icon: LucideIcon; title: string; description: string; phase: string };

const TAB_EMPTY: Record<Exclude<TabId, "overview">, EmptyTab> = {
  sales: { icon: ShoppingCart, title: "Vendas ainda não conectadas", description: "", phase: "Fase 3 — backend núcleo" },
  payments: { icon: CreditCard, title: "Pagamentos ainda não conectados", description: "", phase: "Fase 3 — backend núcleo" },
  receivables: { icon: CalendarClock, title: "Recebíveis ainda não conectados", description: "", phase: "Fase 2 — controle avançado" },
  refunds: {
    icon: RotateCcw,
    title: "Reembolsos e cancelamentos ainda não conectados",
    description:
      "Vendas canceladas, reembolsos, chargebacks, motivo, responsável e auditoria — registrados como eventos financeiros auditáveis.",
    phase: "Fase 2 — controle avançado"
  },
  clients: {
    icon: UsersRound,
    title: "Visão financeira por cliente ainda não conectada",
    description:
      "Total comprado, pago, pendente, em atraso, última compra e custo gerado por APIs, agregados por cliente.",
    phase: "Fase 6 — inteligência financeira"
  },
  services: {
    icon: Package,
    title: "Desempenho por serviço ainda não conectado",
    description:
      "Quantidade vendida, receita bruta e líquida, descontos, taxas, cancelamentos, ticket médio e margem por serviço.",
    phase: "Fase 6 — inteligência financeira"
  },
  "api-costs": {
    icon: Plug,
    title: "Gastos com APIs ainda não conectados",
    description:
      "Custo por provedor, por venda, por cliente e por caso, custo previsto versus real e margem após APIs.",
    phase: "Fase 4 — gastos operacionais"
  },
  taxes: {
    icon: Landmark,
    title: "Tributos e notas ainda não conectados",
    description:
      "Tributos provisionados e confirmados, notas emitidas, pendentes, rejeitadas e canceladas, e custo de emissão. Sem decisão fiscal automática sem validação.",
    phase: "Fase 5 — tributos e notas"
  },
  reports: {
    icon: FileText,
    title: "Relatórios e gerador de PDF ainda não conectados",
    description:
      "Relatórios diário, mensal, por cliente, por serviço e executivo, com geração de PDF pelo backend, filtros, download seguro e histórico auditável.",
    phase: "Fase 6 — relatórios/PDF"
  },
  audit: {
    icon: History,
    title: "Auditoria financeira ainda não conectada",
    description:
      "Registro de alteração de valor, desconto, pagamento manual, cancelamento, reembolso, uso de API paga, emissão de nota e geração de relatório.",
    phase: "Fase 3 — backend núcleo"
  },
  settings: {
    icon: Settings,
    title: "Configurações financeiras ainda não conectadas",
    description:
      "Moeda, formas de pagamento, taxas, descontos permitidos, provedores de API, custo por API, regras tributárias, provedor fiscal, templates de PDF e permissões.",
    phase: "Fase 3 — backend núcleo"
  }
};

function PhasePill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--bd2)] bg-[var(--surf)] px-2.5 py-1 text-[11px] font-medium text-[var(--text2)]">
      {children}
    </span>
  );
}

function OverviewPanel({
  overview,
  loading,
  error
}: {
  overview: FinancialOverview | null;
  loading: boolean;
  error: string | null;
}) {
  const kpis = overview?.kpis ?? null;

  // Composição por situação de pagamento — dados REAIS quando houver.
  const composition = kpis
    ? ([
        { label: "Recebido", value: kpis.received_cents, tone: "teal" },
        { label: "Pendente", value: kpis.pending_cents, tone: "orange" },
        { label: "Cancelado", value: kpis.canceled_cents, tone: "danger" }
      ] as const)
    : [];
  const hasComposition = composition.some((s) => s.value > 0);

  return (
    <div className="space-y-8">
      {error && (
        <div
          className="flex items-start gap-3 rounded-[var(--r)] border border-[rgba(239,68,68,0.28)] bg-[var(--danger-dim)] p-4"
          role="alert"
        >
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[var(--danger)]"
            size={16}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">
              Não foi possível carregar os indicadores
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text2)]">{error}</p>
          </div>
        </div>
      )}

      {KPI_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
            {group.label}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.kpis.map((kpi, index) => {
              const raw = kpis ? kpis[kpi.field] : null;
              const state: KpiState = loading
                ? "loading"
                : raw === null || raw === undefined
                  ? "empty"
                  : "ready";
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
      ))}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard description="Série temporal — chega numa próxima fase" empty title="Vendas por período" />
        <ChartCard description="Distribuição por forma de pagamento — chega numa próxima fase" empty title="Formas de pagamento" />
      </div>

      <ChartCard
        description="Composição do período por situação de pagamento"
        empty={loading || !hasComposition}
        title="Recebido · pendente · cancelado"
      >
        {hasComposition && (
          <StackedBar
            ariaLabel="Composição por situação de pagamento"
            segments={composition.map((s) => ({ ...s }))}
          />
        )}
      </ChartCard>
    </div>
  );
}

/** Aba de tabela (Vendas/Pagamentos/Recebíveis). Estrutura real (colunas +
 *  toolbar), corpo em estado vazio honesto até o backend existir. */
function TablePanel<Row>({
  columns,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  searchPlaceholder,
  phase
}: {
  columns: Column<Row>[];
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  searchPlaceholder: string;
  phase: string;
}) {
  const [query, setQuery] = useState("");
  const rows: Row[] = [];
  const Icon = emptyIcon;

  const toolbar = (
    <div className="relative w-full max-w-sm">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
        size={14}
      />
      <input
        aria-label={searchPlaceholder}
        className="cv-input w-full pl-9"
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        type="search"
        value={query}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <FinancialTable
        columns={columns}
        emptyDescription={emptyDescription}
        emptyIcon={<Icon aria-hidden="true" size={20} />}
        emptyTitle={emptyTitle}
        rowKey={(_, index) => String(index)}
        rows={rows}
        state="empty"
        toolbar={toolbar}
      />
      <div className="flex justify-end">
        <PhasePill>{phase}</PhasePill>
      </div>
    </div>
  );
}

function EmptyTabPanel({ tab }: { tab: EmptyTab }) {
  const Icon = tab.icon;
  return (
    <EmptyState
      action={<PhasePill>{tab.phase}</PhasePill>}
      description={tab.description}
      icon={<Icon aria-hidden="true" size={20} />}
      title={tab.title}
    />
  );
}

export default function FinancialPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Deep-link de aba via hash (ex.: /financial#sales). Sync única no mount.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (isTabId(hash)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync única no mount, sem loop.
      setActiveTab(hash);
    }
  }, []);

  // Carrega os KPIs reais do backend ao montar e quando o período muda.
  useEffect(() => {
    let cancelled = false;
    // Sinaliza carregamento e limpa erro antes do fetch assíncrono (padrão de
    // data-fetching; não causa render em cascata — dispara um único fetch).
    /* eslint-disable react-hooks/set-state-in-effect */
    setOverviewLoading(true);
    setOverviewError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    getFinancialOverview(period)
      .then((data) => {
        if (cancelled) return;
        setOverview(data);
        setOverviewLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Descarta dados do período anterior — nunca exibir números de outro período.
        setOverview(null);
        setOverviewError(
          err instanceof Error ? err.message : "Erro ao carregar a visão financeira"
        );
        setOverviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  let panel: ReactNode;
  if (activeTab === "overview") {
    panel = <OverviewPanel error={overviewError} loading={overviewLoading} overview={overview} />;
  } else if (activeTab === "sales") {
    panel = (
      <TablePanel<SaleRow>
        columns={SALE_COLUMNS}
        emptyDescription="Cada venda (valor bruto, desconto, valor final, status, pagamento, nota fiscal e margem) aparecerá aqui quando o ledger financeiro do backend existir."
        emptyIcon={ShoppingCart}
        emptyTitle="Nenhuma venda no período"
        phase="Fase 3 — backend núcleo"
        searchPlaceholder="Buscar venda ou cliente..."
      />
    );
  } else if (activeTab === "payments") {
    panel = (
      <TablePanel<PaymentRow>
        columns={PAYMENT_COLUMNS}
        emptyDescription="Pagamentos recebidos, pendentes e falhas, com gateway, taxa e valor líquido, virão do ledger de eventos financeiros."
        emptyIcon={CreditCard}
        emptyTitle="Nenhum pagamento no período"
        phase="Fase 3 — backend núcleo"
        searchPlaceholder="Buscar pagamento ou cliente..."
      />
    );
  } else if (activeTab === "receivables") {
    panel = (
      <TablePanel<ReceivableRow>
        columns={RECEIVABLE_COLUMNS}
        emptyDescription="Valores a receber, vencimentos e atrasos serão materializados a partir do cronograma de parcelas."
        emptyIcon={CalendarClock}
        emptyTitle="Nenhum recebível no período"
        phase="Fase 2 — controle avançado"
        searchPlaceholder="Buscar cliente..."
      />
    );
  } else if (activeTab === "api-costs") {
    panel = <ApiCostsPanel period={period} />;
  } else if (activeTab === "taxes") {
    panel = <TaxesNotesPanel period={period} />;
  } else if (activeTab === "reports") {
    panel = <ReportsPanel period={period} />;
  } else {
    panel = <EmptyTabPanel tab={TAB_EMPTY[activeTab]} />;
  }

  return (
    <AuthGuard>
      <AdminGuard>
        <AppLayout>
          <PageTitle
            description="Visão financeira do programa: vendas, pagamentos, recebíveis, reembolsos, custos de API, tributos, notas e relatórios. Estrutura inicial — os dados reais são integrados por fases."
            eyebrow="Financeiro"
            title="Painel financeiro"
          />

          {/* Transparência: a Visão Geral tem dados reais; o resto é honestamente vazio. */}
          <div className="mb-6 flex items-start gap-3 rounded-[var(--r)] border border-[rgba(96,165,250,0.22)] bg-[var(--blue-dim)] p-4">
            <Info aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--blue)]" size={16} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text)]">
                Módulo Financeiro — dados reais (Fases 3–6)
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
                Visão Geral, Gastos com APIs, Tributos e Notas e Relatórios são{" "}
                <strong className="font-semibold text-[var(--text)]">calculados pelo backend</strong>{" "}
                a partir dos dados reais da organização. Indicadores ainda sem fonte (receita
                líquida, margem, atraso) e as tabelas de Vendas/Pagamentos/Recebíveis aparecem
                vazios até serem integrados nas próximas fases.
              </p>
            </div>
          </div>

          {/* Filtro de período (controle transversal). */}
          <div className="cv-glass-bar mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r)] px-4 py-3">
            <PeriodFilter onChange={setPeriod} value={period} />
            <span className="text-[11px] text-[var(--text3)]">
              Mostrando: <span className="font-medium text-[var(--text2)]">{periodLabel(period)}</span>
            </span>
          </div>

          {/* Tabs (padrão ARIA Tabs — espelha cases/[id], A11Y-05) */}
          <div className="relative mb-6">
          <div
            aria-label="Áreas do Financeiro"
            className="flex overflow-x-auto border-b border-[var(--bd)]"
            onKeyDown={(event) => {
              const i = TABS.findIndex((t) => t.id === activeTab);
              let nextIndex: number;
              if (event.key === "ArrowRight") nextIndex = (i + 1) % TABS.length;
              else if (event.key === "ArrowLeft") nextIndex = (i - 1 + TABS.length) % TABS.length;
              else if (event.key === "Home") nextIndex = 0;
              else if (event.key === "End") nextIndex = TABS.length - 1;
              else return;
              event.preventDefault();
              const next = TABS[nextIndex];
              setActiveTab(next.id);
              document.getElementById(`tab-${next.id}`)?.focus();
            }}
            role="tablist"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  aria-controls={active ? `panel-${tab.id}` : undefined}
                  aria-selected={active}
                  className={
                    active
                      ? "flex items-center gap-2 whitespace-nowrap border-b-2 border-[var(--teal)] px-4 py-3 text-xs font-semibold text-[var(--teal)] transition"
                      : "flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-xs font-medium text-[var(--text2)] transition hover:text-[var(--text)]"
                  }
                  id={`tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  tabIndex={active ? 0 : -1}
                  type="button"
                >
                  <Icon aria-hidden="true" size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
            {/* Afordância de overflow: sinaliza que há mais abas à direita. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-px right-0 top-0 w-10 bg-gradient-to-l from-[var(--bg)] to-transparent"
            />
          </div>

          <div
            aria-labelledby={`tab-${activeTab}`}
            id={`panel-${activeTab}`}
            role="tabpanel"
            tabIndex={0}
          >
            {panel}
          </div>
        </AppLayout>
      </AdminGuard>
    </AuthGuard>
  );
}
