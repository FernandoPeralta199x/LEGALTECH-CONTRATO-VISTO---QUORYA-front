import { centsToReaisLabel } from "@/components/CurrencyInput";
import type { InstallmentPlan } from "@/types";

type PaymentReceiptSheetProps = {
  caseCode: string;
  caseTitle: string;
  plan: InstallmentPlan | null;
  /** true = renderiza o comprovante para impressão; false = folha vazia. */
  active: boolean;
};

const METHOD_LABEL: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão de crédito",
  debito: "Cartão de débito"
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("pt-BR");
}

function methodLine(plan: InstallmentPlan): string {
  const label = METHOD_LABEL[plan.method] ?? plan.method;
  const p = plan.payment;
  if ((plan.method === "cartao" || plan.method === "debito") && p?.last4) {
    const brand = p.brand ? `${p.brand} ` : "";
    return `${label} · ${brand}•••• ${p.last4}`.trim();
  }
  return label;
}

/** Comprovante de pagamento imprimível (print-only via .cv-print-sheet). */
export function PaymentReceiptSheet({
  caseCode,
  caseTitle,
  plan,
  active
}: PaymentReceiptSheetProps) {
  if (!active || !plan) {
    return <div className="cv-print-sheet" aria-hidden="true" />;
  }
  const p = plan.payment;
  const simulated = p?.simulated ?? p?.mode === "mock";
  const rows: Array<[string, string]> = [
    ["Método", methodLine(plan)],
    ["Parcelas", `${plan.parcelas}x`],
    ["Valor total", centsToReaisLabel(plan.valorTotalCents)]
  ];
  if (p?.authorizationCode) rows.push(["Autorização", p.authorizationCode]);
  if (p?.externalReference) rows.push(["Referência", p.externalReference]);
  rows.push(["Data", formatDateTime(p?.requestedAt ?? plan.selectedAt)]);

  return (
    <div className="cv-print-sheet" aria-hidden="true">
      <div style={{ borderBottom: "2px solid #111", paddingBottom: "8px", marginBottom: "10px" }}>
        <div style={{ fontSize: "12px", color: "#555" }}>{caseCode}</div>
        <div style={{ fontSize: "18px", fontWeight: 700 }}>Comprovante de pagamento</div>
        <div style={{ fontSize: "12px", color: "#555" }}>{caseTitle}</div>
      </div>

      <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "10px" }}>
        {simulated
          ? "Pagamento simulado confirmado (ambiente local — sem cobrança real)"
          : "Pagamento confirmado"}
      </div>

      <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td style={{ color: "#555", padding: "3px 8px 3px 0", verticalAlign: "top", width: "35%" }}>
                {label}
              </td>
              <td style={{ padding: "3px 0", verticalAlign: "top" }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {plan.schedule.length > 0 && (
        <div style={{ marginTop: "12px", borderTop: "1px solid #ccc", paddingTop: "8px" }}>
          <div style={{ fontSize: "11px", color: "#555", marginBottom: "4px" }}>CRONOGRAMA</div>
          <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
            <tbody>
              {plan.schedule.map((item) => (
                <tr key={item.numero}>
                  <td style={{ padding: "2px 0", color: "#555" }}>Parcela {item.numero}</td>
                  <td style={{ padding: "2px 0" }}>{item.vencimento.split("-").reverse().join("/")}</td>
                  <td style={{ padding: "2px 0", textAlign: "right" }}>
                    {centsToReaisLabel(item.valorCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: "11px", color: "#555", marginTop: "12px" }}>
        Gerado em {new Date().toLocaleString("pt-BR")}
      </div>
    </div>
  );
}
