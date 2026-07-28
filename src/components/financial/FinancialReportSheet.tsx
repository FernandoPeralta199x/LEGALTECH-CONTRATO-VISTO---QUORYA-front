import type { ReactNode } from "react";

import { centsToReaisLabel } from "@/components/CurrencyInput";
import { financialStatusLabel, type FinancialStatus } from "@/components/financial/FinancialStatusPill";
import type { ExecutiveReport } from "@/services/financialReport";

/* Tinta FIXA: o app roda sempre em dark, então tokens cv-* seriam invisíveis no
 * branco forçado da impressão. A folha é auto-contida (tinta escura sobre branco),
 * espelhando PaymentReceiptSheet/TriagePrintSheet. */
const INK = "#111827";
const MUTED = "#4b5563";
const FAINT = "#6b7280";
const LINE = "#d1d5db";
const BRAND = "#0d6b50"; // teal escuro (--teal-dd), legível no papel
const mono = "var(--font-geist-mono)";

const money = (c: number | null | undefined) => centsToReaisLabel(c ?? null);
const intOr = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("pt-BR");

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("pt-BR");
}

/* O backend usa intervalo semiaberto [from, to): `range.to` é EXCLUSIVO (ex.: mês
 * de julho => to = 01/ago). Para a leitura humana do período mostramos o último dia
 * INCLUÍDO (to − 1 dia), evitando que "julho" apareça como "01/07 a 01/08". Aritmética
 * em UTC sobre a parte de data (YYYY-MM-DD) — imune ao fuso do navegador. */
function inclusiveEndLabel(isoExclusiveEnd: string): string {
  const day = isoExclusiveEnd.slice(0, 10);
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ pageBreakInside: "avoid", marginTop: 18 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: BRAND,
          borderBottom: `1px solid ${LINE}`,
          paddingBottom: 4
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: 8 }}>{children}</div>
    </section>
  );
}

function KeyVal({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td style={{ color: MUTED, padding: "3px 10px 3px 0", verticalAlign: "top", width: "55%" }}>
              {label}
            </td>
            <td style={{ padding: "3px 0", textAlign: "right", fontFamily: mono }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DataTable({ head, rows }: { head: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <div style={{ fontSize: 12, color: FAINT, padding: "6px 0" }}>Sem registros no período.</div>;
  }
  return (
    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th
              key={h}
              style={{
                textAlign: i === 0 ? "left" : "right",
                color: FAINT,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: ".04em",
                borderBottom: `1px solid ${LINE}`,
                padding: "4px 6px 4px 0"
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.join("|")}>
            {r.map((cell, i) => (
              <td
                key={i}
                style={{
                  textAlign: i === 0 ? "left" : "right",
                  padding: "3px 6px 3px 0",
                  fontFamily: i === 0 ? undefined : mono,
                  borderBottom: `1px solid #f0f1f3`
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Documento do relatório executivo (tinta fixa). Usado tanto no preview quanto
 *  na folha `.cv-print-sheet`. */
export function FinancialReportSheet({ report }: { report: ExecutiveReport }) {
  const m = report.metadata;
  const o = report.overview;
  const orgId = m.generated_by.user_id; // sem razão social na sessão; usa identificadores reais

  const kpiRows: [string, string][] = [
    ["Receita bruta", money(o.gross_cents)],
    ["Total recebido", money(o.received_cents)],
    // PRC-01: pagamentos mock aparecem à parte (só quando existem), nunca embutidos no recebido.
    ...(o.simulated_cents > 0
      ? ([["Simulado (sem cobrança real)", money(o.simulated_cents)]] as [string, string][])
      : []),
    ["Total pendente", money(o.pending_cents)],
    ["Total em atraso", money(o.overdue_cents)],
    ["Total cancelado", money(o.canceled_cents)],
    ["Total reembolsado", money(o.refunded_cents)],
    ["Ticket médio", money(o.ticket_cents)],
    ["Quantidade de vendas", intOr(o.count)],
    // B2/FIN-03: este agregado é só dos lançamentos MANUAIS (não inclui a estimativa do uso
    // real das APIs) — o rótulo diz isso para o número não se passar por custo total.
    ["APIs (lançamentos manuais)", money(o.api_cost_cents)],
    ["Tributos provisionados", money(o.tax_cents)],
    ["Notas emitidas", intOr(o.invoices_count)]
  ];

  return (
    <div style={{ color: INK, fontFamily: "var(--font-geist-sans)", fontSize: 13, lineHeight: 1.5 }}>
      {/* 1+2 — Cabeçalho + metadados */}
      <div style={{ borderBottom: `2px solid ${INK}`, paddingBottom: 10 }}>
        <div style={{ fontSize: 19, fontWeight: 700 }}>Contrato Visto — {m.title}</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
          Período: <strong>{report.metadata.period}</strong> ({m.range.from.slice(0, 10)} a{" "}
          {inclusiveEndLabel(m.range.to)}) · Moeda: {m.currency}
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
          Gerado em {fmtDateTime(m.generated_at)} por {m.generated_by.email ?? "—"} (
          {m.generated_by.role}) · Org {orgId}
        </div>
      </div>

      {/* 3 — Resumo executivo */}
      <Section title="Resumo executivo">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[
            ["Receita bruta", money(o.gross_cents)],
            ["Recebido", money(o.received_cents)],
            ["Pendente", money(o.pending_cents)],
            ["Vendas", intOr(o.count)]
          ].map(([label, value]) => (
            <div key={label} style={{ minWidth: 120 }}>
              <div style={{ fontSize: 10, color: FAINT, textTransform: "uppercase", letterSpacing: ".04em" }}>
                {label}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: mono, marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* 4 — Indicadores */}
      <Section title="Indicadores do período">
        <KeyVal rows={kpiRows} />
      </Section>

      {/* 5 — Gastos com APIs (lançamentos manuais) */}
      <Section title="Gastos com APIs — lançamentos manuais">
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>
          Somente custos lançados à mão (não inclui a estimativa do uso real das APIs).
          Processado: <strong style={{ fontFamily: mono }}>{money(report.api_costs.summary.api_cost_cents)}</strong> ·
          Previsto: <span style={{ fontFamily: mono }}>{money(report.api_costs.summary.api_cost_forecast_cents)}</span> ·
          Registros: {intOr(report.api_costs.summary.api_cost_count)}
        </div>
        <DataTable
          head={["Provedor", "Custo"]}
          rows={report.api_costs.by_provider.map((p) => [p.provider, money(p.total_cents)])}
        />
      </Section>

      {/* 6 — Tributos */}
      <Section title="Tributos (controle interno)">
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>
          Estimado: <strong style={{ fontFamily: mono }}>{money(report.taxes.summary.tax_estimated_cents)}</strong> ·
          Confirmado: <span style={{ fontFamily: mono }}>{money(report.taxes.summary.tax_confirmed_cents)}</span> ·
          Divergências: {intOr(report.taxes.summary.tax_divergent_count)}
        </div>
        <DataTable
          head={["Tipo", "Provisionado"]}
          rows={report.taxes.by_type.map((t) => [t.tax_type.toUpperCase(), money(t.total_cents)])}
        />
        <div style={{ fontSize: 10, color: FAINT, marginTop: 4, fontStyle: "italic" }}>{report.taxes.disclaimer}</div>
      </Section>

      {/* 7 — Notas fiscais */}
      <Section title="Notas fiscais">
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>
          Custo de emissão:{" "}
          <strong style={{ fontFamily: mono }}>{money(report.fiscal.summary.invoices_issuance_cost_cents)}</strong>
        </div>
        <DataTable
          head={["Status", "Quantidade"]}
          rows={report.fiscal.by_status.map((s) => [financialStatusLabel(s.status as FinancialStatus), intOr(s.count)])}
        />
        <div style={{ fontSize: 10, color: FAINT, marginTop: 4, fontStyle: "italic" }}>{report.fiscal.disclaimer}</div>
      </Section>

      {/* 8 — Resultado */}
      <Section title="Resultado">
        <KeyVal
          rows={[
            ["Receita bruta", money(o.gross_cents)],
            ["Receita líquida", o.net_cents === null ? "— (indisponível)" : money(o.net_cents)],
            ["Margem estimada", o.margin_cents === null ? "— (indisponível)" : money(o.margin_cents)]
          ]}
        />
      </Section>

      {/* 9 — Rodapé / disclaimers */}
      <div style={{ marginTop: 20, borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10, color: FAINT }}>
          {report.disclaimers.map((d) => (
            <li key={d} style={{ marginBottom: 2 }}>
              {d}
            </li>
          ))}
        </ul>
        <div style={{ fontSize: 10, color: FAINT, marginTop: 8 }}>
          Documento gerado pelo sistema Contrato Visto — valores calculados pelo backend.
        </div>
      </div>
    </div>
  );
}
