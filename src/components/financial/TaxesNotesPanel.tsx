"use client";

import {
  Clock,
  Coins,
  Hash,
  Info,
  Landmark,
  Percent,
  Receipt,
  Scale,
  TriangleAlert
} from "lucide-react";
import { useState } from "react";

import { centsToReaisLabel } from "@/components/CurrencyInput";
import { FiscalNoteFormModal } from "@/components/financial/FiscalNoteFormModal";
import {
  FinancialListSection,
  type DonutConfig,
  type SectionKpi
} from "@/components/financial/FinancialListSection";
import {
  FinancialStatusPill,
  type FinancialStatus
} from "@/components/financial/FinancialStatusPill";
import type { Column } from "@/components/financial/FinancialTable";
import type { ChartTone } from "@/components/financial/MiniChart";
import { MoneyText } from "@/components/financial/MoneyText";
import type { PeriodKey } from "@/components/financial/PeriodFilter";
import { SegmentedControl } from "@/components/financial/SegmentedControl";
import { TaxFormModal } from "@/components/financial/TaxFormModal";
import {
  createNote,
  listNotes,
  type CreateNotePayload,
  type FiscalNoteItem,
  type NotesSummary
} from "@/services/fiscalNotes";
import {
  createTax,
  listTaxes,
  type CreateTaxPayload,
  type TaxesSummary,
  type TaxItem
} from "@/services/taxes";

const DONUT_TONES: ChartTone[] = ["orange", "blue", "teal", "danger"];

function topN(items: { label: string; value: number }[]) {
  if (items.length <= DONUT_TONES.length) {
    return items.map((it, i) => ({ ...it, tone: DONUT_TONES[i % DONUT_TONES.length] }));
  }
  const rest = items.slice(3).reduce((s, it) => s + it.value, 0);
  return [
    ...items.slice(0, 3).map((it, i) => ({ ...it, tone: DONUT_TONES[i] })),
    { label: "Outros", value: rest, tone: DONUT_TONES[3] }
  ];
}

const monoTeal = (v: string) => (
  <span className="font-mono text-[11px] uppercase text-[var(--teal)]">{v}</span>
);

/* ── Tributos ─────────────────────────────────────────────────────────────── */
const TAX_COLUMNS: Column<TaxItem>[] = [
  { key: "type", label: "Tipo", render: (r) => monoTeal(r.tax_type) },
  { key: "base", label: "Base", align: "right", render: (r) => <MoneyText cents={r.base_amount_cents} /> },
  { key: "est", label: "Estimado", align: "right", render: (r) => <MoneyText cents={r.estimated_amount_cents} /> },
  { key: "conf", label: "Confirmado", align: "right", render: (r) => <MoneyText cents={r.confirmed_amount_cents} muted={r.confirmed_amount_cents === null} /> },
  { key: "status", label: "Status", render: (r) => <FinancialStatusPill status={r.status as FinancialStatus} /> },
  { key: "comp", label: "Competência", render: (r) => <span className="font-mono text-[11px] text-[var(--text2)]">{`${r.competencia_ano}-${String(r.competencia_mes).padStart(2, "0")}`}</span> }
];

function taxKpis(s?: TaxesSummary): SectionKpi[] {
  return [
    { key: "est", label: "Tributos estimados", icon: Percent, tone: "orange", format: "currency", hint: "Provisionado (informativo)", value: s?.tax_estimated_cents },
    { key: "conf", label: "Confirmados", icon: Scale, tone: "teal", format: "currency", hint: "Validados com o contador", value: s?.tax_confirmed_cents },
    { key: "div", label: "Divergências", icon: TriangleAlert, tone: "danger", format: "integer", hint: "Estimado ≠ confirmado", value: s?.tax_divergent_count },
    { key: "count", label: "Registros", icon: Hash, tone: "blue", format: "integer", hint: "Lançamentos no período", value: s?.tax_count }
  ];
}

function taxDonut(s?: TaxesSummary): DonutConfig {
  const segments = topN((s?.by_type ?? []).map((b) => ({ label: b.tax_type.toUpperCase(), value: b.total_cents })));
  const total = segments.reduce((a, x) => a + x.value, 0);
  return {
    title: "Tributos por tipo",
    description: "Provisionado por tipo de tributo no período",
    centerLabel: centsToReaisLabel(total),
    segments
  };
}

/* ── Notas fiscais ────────────────────────────────────────────────────────── */
const NOTE_COLUMNS: Column<FiscalNoteItem>[] = [
  { key: "type", label: "Tipo", render: (r) => monoTeal(r.doc_type) },
  { key: "numero", label: "Número", render: (r) => (r.numero ? <span className="font-mono text-[11px]">{r.numero}</span> : <span className="text-[var(--text3)]">—</span>) },
  { key: "amount", label: "Valor", align: "right", render: (r) => <MoneyText cents={r.amount_cents} /> },
  { key: "tax", label: "Tributos", align: "right", render: (r) => <MoneyText cents={r.tax_amount_cents} /> },
  { key: "status", label: "Status", render: (r) => <FinancialStatusPill status={r.status as FinancialStatus} /> },
  { key: "cost", label: "Custo emissão", align: "right", render: (r) => <MoneyText cents={r.issuance_cost_cents} /> },
  { key: "date", label: "Data", render: (r) => <span className="font-mono text-[11px] text-[var(--text2)]">{(r.issued_at ?? r.reference_at ?? "").slice(0, 10) || "—"}</span> }
];

function noteKpis(s?: NotesSummary): SectionKpi[] {
  return [
    { key: "auth", label: "Notas emitidas", icon: Receipt, tone: "teal", format: "integer", hint: "Autorizadas no período", value: s?.invoices_authorized_count },
    { key: "pend", label: "Pendentes", icon: Clock, tone: "orange", format: "integer", hint: "Aguardando emissão", value: s?.invoices_pending_count },
    { key: "rej", label: "Rejeitadas", icon: TriangleAlert, tone: "danger", format: "integer", hint: "Rejeitadas — reemitir", value: s?.invoices_rejected_count },
    { key: "cost", label: "Custo de emissão", icon: Coins, tone: "orange", format: "currency", hint: "Custo pago para emitir", value: s?.invoices_issuance_cost_cents }
  ];
}

function noteDonut(s?: NotesSummary): DonutConfig {
  const acc: Record<string, number> = { authorized: 0, note_pending: 0, rejected: 0, note_canceled: 0 };
  (s?.by_status ?? []).forEach((b) => {
    if (b.status in acc) acc[b.status] += b.count;
  });
  const segments = (
    [
      { label: "Emitidas", value: acc.authorized, tone: "teal" },
      { label: "Pendentes", value: acc.note_pending, tone: "orange" },
      { label: "Rejeitadas", value: acc.rejected, tone: "danger" },
      { label: "Canceladas", value: acc.note_canceled, tone: "blue" }
    ] as { label: string; value: number; tone: ChartTone }[]
  ).filter((seg) => seg.value > 0);
  const total = segments.reduce((a, x) => a + x.value, 0);
  return {
    title: "Notas por status",
    description: "Distribuição das notas no período",
    centerLabel: String(total),
    segments
  };
}

export function TaxesNotesPanel({
  period,
  from,
  to
}: {
  period: PeriodKey;
  from?: string;
  to?: string;
}) {
  const [section, setSection] = useState<"taxes" | "notes">("taxes");

  return (
    <div className="space-y-6">
      {/* Disclaimer fixo (spec 12.1): controle interno, não é apuração/emissão fiscal. */}
      <div className="flex items-start gap-3 rounded-[var(--r)] border border-[rgba(96,165,250,0.22)] bg-[var(--blue-dim)] p-4">
        <Info aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--blue)]" size={16} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">Tributos e Notas — controle interno</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
            Os valores são <strong className="font-semibold text-[var(--text)]">informativos</strong> e
            não constituem apuração nem emissão fiscal. Alíquotas, regime, tipo e número de nota devem
            ser validados por contador ou integração fiscal. O sistema apenas <em>registra</em> o que
            já foi apurado/emitido.
          </p>
        </div>
      </div>

      <SegmentedControl
        ariaLabel="Alternar entre tributos e notas"
        onChange={setSection}
        options={[
          { id: "taxes", label: "Tributos", icon: Landmark },
          { id: "notes", label: "Notas fiscais", icon: Receipt }
        ]}
        value={section}
      />

      {section === "taxes" ? (
        <FinancialListSection<TaxItem, TaxesSummary, CreateTaxPayload>
          key="taxes"
          buildDonut={taxDonut}
          buildKpis={taxKpis}
          columns={TAX_COLUMNS}
          creator={createTax}
          emptyDescription="Registre tributos provisionados e confirmados (ISS, PIS, COFINS, DAS…) para acompanhar a carga estimada. Controle interno — não substitui apuração fiscal."
          emptyIcon={Landmark}
          emptyTitle="Nenhum tributo no período"
          eyebrow="Tributos"
          fetcher={listTaxes}
          from={from}
          newLabel="Novo tributo"
          period={period}
          renderModal={(p) => <TaxFormModal {...p} />}
          to={to}
          rowKey={(r) => r.id}
          searchPlaceholder="Buscar tipo ou status..."
          searchText={(r) => `${r.tax_type} ${r.status}`}
          successText="Tributo registrado."
        />
      ) : (
        <FinancialListSection<FiscalNoteItem, NotesSummary, CreateNotePayload>
          key="notes"
          buildDonut={noteDonut}
          buildKpis={noteKpis}
          columns={NOTE_COLUMNS}
          creator={createNote}
          emptyDescription="Registre notas emitidas, pendentes, rejeitadas e canceladas, e o custo de emissão. O sistema não emite documento fiscal — apenas registra o já emitido."
          emptyIcon={Receipt}
          emptyTitle="Nenhuma nota no período"
          eyebrow="Notas fiscais"
          fetcher={listNotes}
          from={from}
          newLabel="Nova nota"
          period={period}
          renderModal={(p) => <FiscalNoteFormModal {...p} />}
          to={to}
          rowKey={(r) => r.id}
          searchPlaceholder="Buscar tipo, número ou status..."
          searchText={(r) => `${r.doc_type} ${r.numero ?? ""} ${r.status}`}
          successText="Nota registrada."
        />
      )}
    </div>
  );
}
