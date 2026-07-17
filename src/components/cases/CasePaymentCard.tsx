"use client";

import { CheckCircle2, CreditCard, Printer } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { centsToReaisLabel } from "@/components/CurrencyInput";
import { formatBps } from "@/lib/formatters";
import { isCardMethod, methodLabel, paymentStatusLabel } from "@/lib/paymentMethods";
import type { InstallmentPlan } from "@/types";

/** Formata "AAAA-MM-DD" como dd/mm/aaaa sem passar por Date (evita shift de fuso). */
function formatDueDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

type CasePaymentCardProps = {
  /** Plano de parcelamento do caso (null = ainda sem pagamento registrado). */
  installmentPlan: InstallmentPlan | null;
  /** Status de pagamento do caso (chave de paymentStatusLabel). */
  paymentStatus: string;
  /** Pagamento pendente (mostra o CTA "Concluir pagamento"). */
  paymentPending: boolean;
  /** Id do caso, para o link de conclusão do pagamento. */
  caseId: string;
  /** Dispara a impressão/PDF do comprovante (folha controlada pelo pai). */
  onPrint: () => void;
};

/**
 * Card de Pagamento da aba Visão geral do caso. Extraído do god-file
 * cases/[id]/page.tsx (o estado `showReceipt` é local; a impressão fica no pai
 * via `onPrint`, pois a folha PaymentReceiptSheet é renderizada lá).
 */
export function CasePaymentCard({
  installmentPlan,
  paymentStatus,
  paymentPending,
  caseId,
  onPrint
}: CasePaymentCardProps) {
  const [showReceipt, setShowReceipt] = useState(false);

  return (
    <Card
      className="lg:col-span-2"
      title={
        <span className="flex items-center gap-2">
          <CreditCard size={16} style={{ color: "var(--accent)" }} />
          Pagamento
        </span>
      }
    >
      {installmentPlan ? (
        <div>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: "Parcelas",
                value: `${installmentPlan.parcelas}x de ${centsToReaisLabel(
                  installmentPlan.schedule[0]?.valorCents ??
                    installmentPlan.valorTotalCents
                )}`
              },
              {
                label: "Valor total",
                value: centsToReaisLabel(installmentPlan.valorTotalCents)
              },
              {
                label: "Método",
                value: methodLabel(installmentPlan.method)
              },
              {
                label: "Status",
                value: paymentStatusLabel(paymentStatus)
              }
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-[11px] text-[var(--text3)]">
                  {item.label}
                </dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold text-[var(--text)]">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          {installmentPlan.hasJuros && (
            <p className="mt-3 text-[11px] text-[var(--text3)]">
              Juros de{" "}
              <span className="font-mono">
                {formatBps(installmentPlan.jurosMensalBps)}%
              </span>{" "}
              a.m. · acréscimo de{" "}
              <span className="font-mono">
                {centsToReaisLabel(installmentPlan.acrescimoCents)}
              </span>
            </p>
          )}
          {installmentPlan.schedule.length > 0 && (
            <div className="mt-4 border-t border-[var(--bd)] pt-4">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-[var(--text3)]">
                Cronograma
              </p>
              <div className="space-y-1.5">
                {installmentPlan.schedule.map((item, index) => (
                  <div
                    className="animate-in flex items-center justify-between gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-1.5 text-xs"
                    key={item.numero}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <span className="text-[var(--text2)]">
                      Parcela {item.numero}
                    </span>
                    <span className="text-[var(--text2)]">
                      {formatDueDate(item.vencimento)}
                    </span>
                    <span className="font-mono font-semibold text-[var(--text)]">
                      {centsToReaisLabel(item.valorCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button
              icon={<CheckCircle2 aria-hidden="true" size={15} />}
              onClick={() => setShowReceipt((v) => !v)}
              variant="secondary"
            >
              {showReceipt ? "Ocultar comprovante" : "Ver comprovante"}
            </Button>
          </div>
          {showReceipt && (
            <div className="mt-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className="shrink-0 text-[var(--teal)]"
                  size={18}
                />
                <p className="text-sm font-semibold text-[var(--text)]">
                  {(installmentPlan.payment?.simulated ?? true)
                    ? "Pagamento simulado confirmado"
                    : "Pagamento confirmado"}
                </p>
              </div>
              <p className="mt-1 text-[11px] text-[var(--text3)]">
                Ambiente local — nenhuma cobrança real foi gerada.
              </p>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text3)]">Método</dt>
                  <dd className="text-right font-medium text-[var(--text)]">
                    {methodLabel(installmentPlan.method)}
                    {isCardMethod(installmentPlan.method) &&
                    installmentPlan.payment?.last4
                      ? ` · ${
                          installmentPlan.payment.brand
                            ? installmentPlan.payment.brand + " "
                            : ""
                        }•••• ${installmentPlan.payment.last4}`
                      : ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text3)]">Parcelas</dt>
                  <dd className="text-right font-mono font-medium text-[var(--text)]">
                    {installmentPlan.parcelas}x
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text3)]">Valor total</dt>
                  <dd className="text-right font-mono font-medium text-[var(--text)]">
                    {centsToReaisLabel(installmentPlan.valorTotalCents)}
                  </dd>
                </div>
                {installmentPlan.payment?.authorizationCode && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--text3)]">Autorização</dt>
                    <dd className="text-right font-mono font-medium text-[var(--text)]">
                      {installmentPlan.payment.authorizationCode}
                    </dd>
                  </div>
                )}
                {installmentPlan.payment?.externalReference && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--text3)]">Referência</dt>
                    <dd className="break-all text-right font-mono font-medium text-[var(--text)]">
                      {installmentPlan.payment.externalReference}
                    </dd>
                  </div>
                )}
                {installmentPlan.payment?.requestedAt && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--text3)]">Data</dt>
                    <dd className="text-right font-medium text-[var(--text)]">
                      {new Date(
                        installmentPlan.payment.requestedAt
                      ).toLocaleString("pt-BR")}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 flex justify-end">
                <Button
                  icon={<Printer aria-hidden="true" size={15} />}
                  onClick={onPrint}
                  variant="secondary"
                >
                  Imprimir / salvar PDF
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : paymentPending ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--text2)]">
            O pagamento deste caso ainda está pendente. Conclua para registrar o
            plano de parcelamento.
          </p>
          <Button
            href={`/cases/${caseId}/pagamento`}
            icon={<CreditCard aria-hidden="true" size={15} />}
          >
            Concluir pagamento
          </Button>
        </div>
      ) : (
        <p className="text-sm text-[var(--text2)]">
          Status do pagamento:{" "}
          {paymentStatusLabel(paymentStatus)}.
        </p>
      )}
    </Card>
  );
}
