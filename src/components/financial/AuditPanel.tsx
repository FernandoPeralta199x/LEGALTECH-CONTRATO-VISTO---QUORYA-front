"use client";

import { Activity, FilePlus2, History, Info, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { centsToReaisLabel } from "@/components/CurrencyInput";
import { ErrorState } from "@/components/ErrorState";
import { FinancialTable, type Column } from "@/components/financial/FinancialTable";
import { KpiCard, type KpiState } from "@/components/financial/KpiCard";
import type { PeriodKey } from "@/components/financial/PeriodFilter";
import { cn } from "@/lib/cn";
import {
  getFinancialAudit,
  type AuditChange,
  type AuditEvent,
  type AuditResponse
} from "@/services/financialAudit";

const RESOURCE_LABEL: Record<string, string> = {
  requests: "Venda",
  clients: "Cliente",
  pricing_configs: "Preços",
  external_api_costs: "Custo de API",
  tax_provisions: "Tributo",
  fiscal_documents: "Nota fiscal"
};

const ACTION_META: Record<AuditEvent["action"], { label: string; cls: string }> = {
  INSERT: { label: "Criou", cls: "cv-badge-teal" },
  UPDATE: { label: "Alterou", cls: "cv-badge-blue" },
  DELETE: { label: "Removeu", cls: "cv-badge-red" }
};

// Humaniza os nomes de campo mais comuns; os demais caem no nome cru (é uma trilha
// técnica para admin — aceitável).
const FIELD_LABEL: Record<string, string> = {
  base_price_cents: "preço base",
  price_cents: "preço",
  total_price_cents: "valor total",
  estimated_amount_cents: "estimado",
  confirmed_amount_cents: "confirmado",
  amount_cents: "valor",
  unit_cost_cents: "custo unitário",
  payment_status: "pagamento",
  product_label: "serviço",
  title: "título",
  legal_name: "razão social",
  document_number: "documento",
  status: "status",
  version: "versão",
  numero: "número",
  provider: "provedor",
  quantity: "quantidade"
};

const isObj = (v: unknown) => typeof v === "object" && v !== null;

function fmtValue(field: string, v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (field.endsWith("_cents") && typeof v === "number") return centsToReaisLabel(v);
  if (isObj(v)) return JSON.stringify(v).slice(0, 48);
  return String(v);
}

const fieldLabel = (f: string) => FIELD_LABEL[f] ?? f;

/** Renderiza as mudanças de um evento de forma compacta (até 3 + "mais"). */
function Changes({ event }: { event: AuditEvent }) {
  const cs = event.changes;
  if (cs.length === 0) {
    return <span className="text-[var(--text3)]">—</span>;
  }
  const shown = cs.slice(0, 3);
  const rest = cs.length - shown.length;
  return (
    <div className="flex flex-col gap-0.5">
      {shown.map((c: AuditChange) => (
        <span className="text-[11px] leading-4" key={c.field}>
          <span className="text-[var(--text3)]">{fieldLabel(c.field)}:</span>{" "}
          {event.action === "INSERT" ? (
            <span className="font-mono text-[var(--text)]">{fmtValue(c.field, c.after)}</span>
          ) : event.action === "DELETE" ? (
            <span className="font-mono text-[var(--text2)] line-through">{fmtValue(c.field, c.before)}</span>
          ) : isObj(c.before) || isObj(c.after) ? (
            // objeto→objeto: não trunca cego (dois objetos distintos poderiam
            // aparecer como strings idênticas nos primeiros 48 chars).
            <span className="text-[var(--text2)]">(estrutura alterada)</span>
          ) : (
            <>
              <span className="font-mono text-[var(--text3)]">{fmtValue(c.field, c.before)}</span>
              <span className="text-[var(--text3)]"> → </span>
              <span className="font-mono text-[var(--text)]">{fmtValue(c.field, c.after)}</span>
            </>
          )}
        </span>
      ))}
      {rest > 0 && <span className="text-[10px] text-[var(--text3)]">+{rest} campo(s)</span>}
    </div>
  );
}

const COLUMNS: Column<AuditEvent>[] = [
  {
    key: "when",
    label: "Quando",
    render: (r) => (
      <span className="whitespace-nowrap font-mono text-[11px] text-[var(--text2)]">
        {r.created_at ? new Date(r.created_at).toLocaleString("pt-BR") : "—"}
      </span>
    )
  },
  {
    key: "who",
    label: "Quem",
    render: (r) => (
      <span className="text-[12px] text-[var(--text)]">
        {r.actor_email ?? r.actor_name ?? (r.user_id ? `${r.user_id.slice(0, 8)}…` : "—")}
      </span>
    )
  },
  {
    key: "action",
    label: "Ação",
    render: (r) => <span className={cn("cv-badge", ACTION_META[r.action]?.cls)}>{ACTION_META[r.action]?.label ?? r.action}</span>
  },
  {
    key: "resource",
    label: "Recurso",
    render: (r) => (
      <span className="text-[12px] text-[var(--text)]">
        {RESOURCE_LABEL[r.resource_type] ?? r.resource_type}
      </span>
    )
  },
  { key: "changes", label: "Alterações", render: (r) => <Changes event={r} /> }
];

export function AuditPanel({
  period,
  from,
  to
}: {
  period: PeriodKey;
  from?: string;
  to?: string;
}) {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resourceType, setResourceType] = useState("");
  const [action, setAction] = useState("");
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    getFinancialAudit(period, from, to, resourceType || undefined, action || undefined)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Erro ao carregar a auditoria");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, from, to, resourceType, action, reload]);

  const s = data?.summary;
  const kpiState: KpiState = error ? "empty" : loading ? "loading" : "ready";

  const kpis = [
    { key: "total", label: "Eventos", icon: Activity, hint: "Registros de auditoria no período", value: s?.total },
    { key: "updates", label: "Alterações", icon: History, hint: "Mudanças de valor/estado", value: s?.updates },
    { key: "inserts", label: "Criações", icon: FilePlus2, hint: "Novos registros", value: s?.inserts },
    { key: "actors", label: "Responsáveis", icon: Users, hint: "Usuários distintos que agiram", value: s?.actors }
  ];

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const q = query.trim().toLowerCase();
  const hasQuery = q.length > 0;
  const filtered = q
    ? items.filter((it) =>
        `${it.actor_email ?? ""} ${it.actor_name ?? ""} ${it.user_id ?? ""} ${it.resource_type}`
          .toLowerCase()
          .includes(q)
      )
    : items;
  const tableState = loading ? "loading" : error ? "error" : filtered.length === 0 ? "empty" : "ready";
  const truncated = !loading && !error && total > items.length;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-[220px]">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
          size={14}
        />
        <input
          aria-label="Buscar por responsável ou recurso"
          className="cv-input w-full pl-9"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar responsável..."
          type="search"
          value={query}
        />
      </div>
      <select
        aria-label="Filtrar por recurso"
        className="cv-input"
        onChange={(e) => setResourceType(e.target.value)}
        value={resourceType}
      >
        <option value="">Todos os recursos</option>
        {(data?.resources ?? []).map((r) => (
          <option key={r} value={r}>
            {RESOURCE_LABEL[r] ?? r}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por ação"
        className="cv-input"
        onChange={(e) => setAction(e.target.value)}
        value={action}
      >
        <option value="">Todas as ações</option>
        <option value="INSERT">Criações</option>
        <option value="UPDATE">Alterações</option>
        <option value="DELETE">Remoções</option>
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-[var(--r)] border border-[rgba(96,165,250,0.22)] bg-[var(--blue-dim)] p-4">
        <Info aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--blue)]" size={16} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">Auditoria financeira — quem alterou o quê</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
            Trilha de <strong className="font-semibold text-[var(--text)]">vendas, clientes, configuração de
            preço, custos de API, tributos e notas</strong> — ator, ação, valor antes→depois e data. Ações com
            usuário identificado mostram o responsável; escritas automáticas do sistema aparecem sem responsável.
          </p>
        </div>
      </div>

      {error && <ErrorState description={error} title="Não foi possível carregar a auditoria" />}

      <div>
        <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
          Trilha de auditoria
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, index) => {
            const raw = kpi.value;
            const state: KpiState =
              kpiState !== "ready" ? kpiState : raw === null || raw === undefined ? "empty" : "ready";
            return (
              <KpiCard
                format="integer"
                hint={kpi.hint}
                icon={kpi.icon}
                index={index}
                key={kpi.key}
                label={kpi.label}
                state={state}
                tone="blue"
                valueNumber={typeof raw === "number" ? raw : undefined}
              />
            );
          })}
        </div>
      </div>

      <FinancialTable
        columns={COLUMNS}
        emptyDescription={
          hasQuery
            ? truncated
              ? `Nenhum dos ${items.length} eventos carregados corresponde à busca. A busca cobre apenas os mais recentes — há ${total} no período (refine o período para alcançar os demais).`
              : "Nenhum evento carregado corresponde à busca."
            : "Alterações de preço, custos de API, tributos e notas aparecem aqui — quem fez, quando e o valor antes e depois."
        }
        emptyIcon={<History aria-hidden="true" size={20} />}
        emptyTitle={hasQuery ? "Nenhum resultado para a busca" : "Nenhum evento de auditoria no período"}
        errorMessage={error ?? undefined}
        onRetry={() => setReload((r) => r + 1)}
        rowKey={(row) => row.id}
        rows={filtered}
        state={tableState}
        toolbar={toolbar}
      />

      {truncated && (
        <p className="px-1 text-[11px] text-[var(--text3)]">
          Mostrando os {items.length} eventos mais recentes de {total} no período.
          {hasQuery ? " A busca cobre apenas esses eventos carregados." : ""}
        </p>
      )}
    </div>
  );
}
