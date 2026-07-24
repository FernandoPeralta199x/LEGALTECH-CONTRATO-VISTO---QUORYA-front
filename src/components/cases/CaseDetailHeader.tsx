import { Badge } from "@/components/Badge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { caseDisplayTitle, formatDate } from "@/lib/formatters";
import {
  productLabel,
  recommendationLabel,
  riskLabel,
  sourceModeLabel
} from "@/lib/reportLabels";
import type { Case, CaseAggregate, CaseParty } from "@/types";

/** Cabeçalho do detalhe do caso: código, status, progresso e a lista de metadados.
 *  Apresentacional — extraído de cases/[id]/page.tsx sem alterar a marcação. */
export function CaseDetailHeader({
  caseData,
  summary,
  caseParties,
  paymentPending
}: {
  caseData: Case;
  summary: CaseAggregate["summary"] | undefined;
  caseParties: CaseParty[];
  paymentPending: boolean;
}) {
  return (
    <div className="cv-card mb-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-xs font-semibold text-brand-teal">
              {caseData.code}
            </span>
            <StatusBadge status={caseData.status} />
            <PriorityBadge priority={caseData.priority} />
            {paymentPending && <Badge tone="orange">Pagamento pendente</Badge>}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
            {caseDisplayTitle(caseData)}
          </h1>
          <p className="mt-1 text-sm text-[var(--text2)]">
            {caseData.clientName} · {productLabel(caseData.caseType)}
          </p>
          {caseData.notes && (
            <p className="mt-2 text-xs leading-5 text-[var(--text2)]">{caseData.notes}</p>
          )}
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className="mb-3 text-left sm:text-right">
            <span className="font-mono text-2xl font-bold tracking-tight text-[var(--text)]">
              {caseData.progressPercent}%
            </span>
            <p className="text-[11px] text-[var(--text2)]">Progresso geral</p>
          </div>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--surf3)]">
            <div
              className="h-1.5 rounded-full bg-[var(--teal)]"
              style={{ width: `${caseData.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <dl className="mt-6 flex flex-wrap gap-6 border-t border-[var(--bd)] pt-4 text-xs">
        {[
          {
            label: "Responsável",
            value: caseData.assignedTo ?? "Não atribuído"
          },
          { label: "Documentos", value: `${summary?.documentsCount ?? caseData.documentsCount}` },
          { label: "Partes", value: `${summary?.partiesCount ?? caseParties.length}` },
          { label: "Risco", value: riskLabel(summary?.riskLevel ?? caseData.riskLevel) },
          {
            label: "Recomendação",
            value: recommendationLabel(caseData.recommendation)
          },
          {
            label: "Origem",
            value: sourceModeLabel(summary?.sourceMode ?? caseData.sourceMode)
          },
          {
            label: "Criado em",
            value: formatDate(caseData.createdAt)
          },
          {
            label: "Atualizado",
            value: formatDate(caseData.updatedAt)
          }
        ].map((item) => (
          <div key={item.label}>
            <dt className="text-[var(--text3)]">{item.label}</dt>
            <dd className="mt-0.5 font-medium text-[var(--text2)]">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
