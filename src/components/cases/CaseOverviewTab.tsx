"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileText,
  Play
} from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CasePaymentCard } from "@/components/cases/CasePaymentCard";
import { StatusBadge } from "@/components/StatusBadge";
import { reportStatusLabel, triageStatusLabel } from "@/lib/reportLabels";
import type {
  Case,
  CaseOperationSummary,
  CaseParty,
  InstallmentPlan,
  PaymentStatus,
  Report
} from "@/types";

type CaseOverviewTabProps = {
  caseData: Case;
  summary: CaseOperationSummary | undefined;
  caseParties: CaseParty[];
  caseReport: Report | null;
  caseIsCompleted: boolean;
  canWrite: boolean;
  triageHasRun: boolean;
  triageRunning: boolean;
  reportBusy: boolean;
  showPayment: boolean;
  installmentPlan: InstallmentPlan | null;
  paymentStatus: PaymentStatus;
  paymentPending: boolean;
  onPrintReceipt: () => void;
  onRunTriage: () => void;
  onGenerateReport: () => void;
  onOpenApprove: () => void;
};

/**
 * Aba "Visão geral" do caso. PRESENTACIONAL, extraída do god-file
 * cases/[id]/page.tsx: todo o estado e os handlers ficam no pai e chegam por
 * props. Sem mudança de comportamento.
 */
export function CaseOverviewTab({
  caseData,
  summary,
  caseParties,
  caseReport,
  caseIsCompleted,
  canWrite,
  triageHasRun,
  triageRunning,
  reportBusy,
  showPayment,
  installmentPlan,
  paymentStatus,
  paymentPending,
  onPrintReceipt,
  onRunTriage,
  onGenerateReport,
  onOpenApprove
}: CaseOverviewTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2 animate-in">
      <Card title="Status atual">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-[rgba(32,201,151,0.3)] bg-[var(--teal-dim)]">
            <span className="font-mono text-sm font-bold text-[var(--teal)]">
              {caseData.progressPercent}%
            </span>
          </div>
          <div>
            <StatusBadge status={caseData.status} />
            {caseData.assignedTo && (
              <p className="mt-1.5 text-xs text-[var(--text2)]">
                Responsável: {caseData.assignedTo}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card title="Estatísticas">
        <dl className="grid grid-cols-2 gap-4">
          {[
            { label: "Documentos", value: summary?.documentsCount ?? caseData.documentsCount },
            { label: "Partes", value: summary?.partiesCount ?? caseParties.length },
            {
              label: "Triagem",
              value: triageStatusLabel(summary?.triageStatus)
            },
            {
              label: "Relatório",
              value: reportStatusLabel(caseReport)
            }
          ].map((stat) => (
            <div key={stat.label}>
              <dt className="text-[11px] text-[var(--text3)]">{stat.label}</dt>
              <dd className="mt-0.5 font-mono text-lg font-bold tracking-tight text-[var(--text)]">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {showPayment && (
        <CasePaymentCard
          caseId={caseData.id}
          installmentPlan={installmentPlan}
          onPrint={onPrintReceipt}
          paymentPending={paymentPending}
          paymentStatus={paymentStatus}
        />
      )}

      <Card className="lg:col-span-2" title="Próximos passos">
        {caseIsCompleted ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="shrink-0 text-[var(--teal)]" size={18} />
            <p className="text-sm text-[var(--text2)]">
              Caso concluído — relatório aprovado. Nenhuma ação pendente.
            </p>
          </div>
        ) : paymentPending ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text2)]">
              Conclua o pagamento do pedido para liberar a triagem.
            </p>
            {canWrite && (
              <Button
                href={`/cases/${caseData.id}/pagamento`}
                icon={<CreditCard aria-hidden="true" size={15} />}
              >
                Concluir pagamento
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text2)]">
              {!triageHasRun
                ? "Execute a triagem para coletar as evidências dos provedores."
                : !caseReport
                  ? "Gere o parecer consolidando as evidências da triagem."
                  : "Revise o parecer e aprove para concluir o caso."}
            </p>
            {canWrite ? (
              !triageHasRun ? (
                <Button
                  icon={<Play aria-hidden="true" size={15} />}
                  loading={triageRunning}
                  onClick={onRunTriage}
                >
                  Rodar triagem
                </Button>
              ) : !caseReport ? (
                <Button
                  icon={<FileText aria-hidden="true" size={15} />}
                  loading={reportBusy}
                  onClick={onGenerateReport}
                >
                  Gerar relatório
                </Button>
              ) : (
                <Button
                  icon={<CheckCircle2 aria-hidden="true" size={15} />}
                  onClick={onOpenApprove}
                >
                  Aprovar relatório
                </Button>
              )
            ) : (
              <span className="text-xs text-[var(--text3)]">Somente admin/analista</span>
            )}
          </div>
        )}
      </Card>

      {caseData.status === "revisao_humana" && (
        <div className="lg:col-span-2 rounded-lg border border-[rgba(249,115,22,0.25)] bg-[var(--orange-dim)] p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="shrink-0 text-[var(--orange)]" size={20} />
            <div>
                <p className="text-sm font-semibold text-[var(--text)]">
                Revisão demonstrativa
              </p>
              <p className="mt-0.5 text-xs text-[var(--text2)]">
                Este caso está em etapa demonstrativa de revisão. Revisão
                humana persistida, aprovação real e entrega ao cliente ficam no
                roadmap.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
