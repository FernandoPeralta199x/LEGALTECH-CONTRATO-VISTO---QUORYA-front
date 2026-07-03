import { evidenceRows, truncate } from "@/src/lib/evidence";
import type { ProviderResult, TriageModule } from "@/types";

type TriagePrintSheetProps = {
  caseCode: string;
  caseTitle: string;
  clientName?: string;
  modules: TriageModule[];
  resultByModule: Map<string, ProviderResult>;
  /** moduleId a imprimir, "all" para todos, ou null (não imprime). */
  target: string | null;
};

function ModuleBlock({
  module,
  result
}: {
  module: TriageModule;
  result?: ProviderResult;
}) {
  const rows = evidenceRows(result?.normalizedResult);
  const confidencePct =
    typeof result?.confidence === "number" ? Math.round(result.confidence * 100) : null;

  return (
    <div style={{ borderTop: "1px solid #ccc", padding: "12px 0", pageBreakInside: "avoid" }}>
      <div style={{ fontSize: "14px", fontWeight: 600 }}>{module.moduleLabel}</div>
      <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px" }}>
        {module.provider} · {module.status}
      </div>
      {module.summary && (
        <div style={{ fontSize: "12px", marginBottom: "6px" }}>{module.summary}</div>
      )}
      {rows.length > 0 && (
        <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td style={{ color: "#555", padding: "2px 8px 2px 0", verticalAlign: "top", width: "40%" }}>
                  {row.label}
                </td>
                <td style={{ padding: "2px 0", verticalAlign: "top" }}>{truncate(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ fontSize: "11px", color: "#555", marginTop: "6px" }}>
        {(result?.riskSignals?.length ?? 0) > 0 &&
          `Sinais: ${result?.riskSignals.join(", ")}. `}
        {confidencePct !== null && `Confiança: ${confidencePct}%.`}
      </div>
    </div>
  );
}

export function TriagePrintSheet({
  caseCode,
  caseTitle,
  clientName,
  modules,
  resultByModule,
  target
}: TriagePrintSheetProps) {
  if (!target) {
    return <div className="cv-print-sheet" aria-hidden="true" />;
  }
  const toPrint =
    target === "all" ? modules : modules.filter((module) => module.id === target);

  return (
    <div className="cv-print-sheet" aria-hidden="true">
      <div style={{ borderBottom: "2px solid #111", paddingBottom: "8px", marginBottom: "8px" }}>
        <div style={{ fontSize: "12px", color: "#555" }}>{caseCode}</div>
        <div style={{ fontSize: "18px", fontWeight: 700 }}>{caseTitle}</div>
        {clientName && <div style={{ fontSize: "12px", color: "#555" }}>Cliente: {clientName}</div>}
        <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
          Evidências da triagem · {target === "all" ? `${toPrint.length} módulos` : "1 módulo"} ·
          {" "}
          gerado em {new Date().toLocaleString("pt-BR")} · dados simulados (MVP local)
        </div>
      </div>
      {toPrint.map((module) => (
        <ModuleBlock key={module.id} module={module} result={resultByModule.get(module.id)} />
      ))}
    </div>
  );
}
