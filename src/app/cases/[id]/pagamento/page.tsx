"use client";

import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileQuestion,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CreditCardForm } from "@/components/cases/payment/CreditCardForm";
import { centsToReaisLabel } from "@/components/CurrencyInput";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Notification } from "@/components/Notification";
import { PageTitle } from "@/components/PageTitle";
import { caseDisplayTitle, formatBpsMensal } from "@/lib/formatters";
import { errorMessage } from "@/lib/errorMessage";
import { ApiClientError } from "@/services/apiClient";
import { createCasePayment, getCaseAggregate } from "@/services/cases";
import {
  createPixCharge,
  getPixStatus,
  simulatePixPaid,
  type PixCharge,
  type PixChargeStatus
} from "@/services/pix";
import { PixChargePanel } from "@/components/cases/payment/PixChargePanel";
import { tokenizeCard, type RawCard } from "@/services/payment/tokenize";
import {
  type InstallmentOption,
  type PricingEstimate
} from "@/services/pricing";
import { isCardMethod, isPaymentMethod, METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/paymentMethods";
import type { CaseAggregate, PaymentMethod } from "@/types";

type PageProps = { params: Promise<{ id: string }> };

/** Formata "AAAA-MM-DD" como dd/mm/aaaa sem passar por Date (evita shift de fuso). */
function formatDueDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

function jurosLabel(bps: number): string {
  return formatBpsMensal(bps); // ARQ-05: fonte única do formato de juros
}

export default function CasePaymentPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  // Gerada UMA vez por visita à tela: replays do mesmo clique são idempotentes.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [aggregate, setAggregate] = useState<CaseAggregate | null>(null);
  const [aggregateSource, setAggregateSource] = useState<"api" | "mock">("api");
  const [estimate, setEstimate] = useState<PricingEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedParcelas, setSelectedParcelas] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // PRC-02: guarda a MENSAGEM do 409, não um booleano — assim o conflito de "já
  // registrado / em processamento" e o de divergência de preço ("Os valores foram
  // atualizados...") mostram cada um seu texto real, em vez de um rótulo fixo enganoso.
  // O fluxo Pix (409 de cobrança já existente/paga) reusa a mesma mensagem.
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [pixCharge, setPixCharge] = useState<PixCharge | null>(null);
  const [pixStatus, setPixStatus] = useState<PixChargeStatus | null>(null);
  const [pixSimulating, setPixSimulating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setConflictMessage(null);
    try {
      const result = await getCaseAggregate(id);
      setAggregate(result.data);
      setAggregateSource(result.source);

      if (result.source === "api" && result.data.paymentStatus === "pending") {
        // Opções vêm do próprio caso (backend autoritativo). NÃO re-estimar por
        // módulos: os module_keys da triagem não são os códigos do pricing.
        const est: PricingEstimate = {
          product: result.data.case.product,
          currency: "BRL",
          base_price_cents: 0,
          modules: [],
          modules_total_cents: 0,
          total_price_cents: result.data.totalPriceCents,
          sla_hours: 0,
          installment_options: result.data.installmentOptions,
          pricing_config_version: result.data.pricingConfigVersion,
          payment_mode: result.data.paymentMode
        };
        setEstimate(est);
        const firstOption = est.installment_options[0] ?? null;
        setSelectedParcelas(firstOption ? firstOption.parcelas : null);
        setMethod(firstOption?.allowed_methods.find(isPaymentMethod) ?? null);
      }
    } catch (err) {
      setLoadError(
        errorMessage(err, "Não foi possível carregar os dados de pagamento.")
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // Polling do status da cobrança Pix (backend-autoritativo): enquanto PENDING_PAYMENT,
  // consulta a cada 4s. A confirmação NUNCA parte do cliente — só reflete o que o backend
  // gravou (via webhook). Para quando sai de PENDING (PAID/expirado/etc.).
  useEffect(() => {
    if (!pixCharge || pixStatus !== "PENDING_PAYMENT") return;
    let cancelled = false;
    const interval = window.setInterval(() => {
      void getPixStatus(id)
        .then((st) => {
          if (!cancelled && st.status) setPixStatus(st.status);
        })
        .catch(() => {
          // silencioso: a próxima tentativa pega; polling não deve piscar erro na tela
        });
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [id, pixCharge, pixStatus]);

  const options = estimate?.installment_options ?? [];
  const selectedOption =
    options.find((option) => option.parcelas === selectedParcelas) ?? null;

  function handleSelectOption(option: InstallmentOption) {
    setSelectedParcelas(option.parcelas);
    setSubmitError("");
    if (!method || !option.allowed_methods.includes(method)) {
      setMethod(option.allowed_methods.find(isPaymentMethod) ?? null);
    }
  }

  async function handleConfirm() {
    if (submitting || !selectedOption || !method) return;
    setSubmitting(true);
    setSubmitError("");
    setConflictMessage(null);
    try {
      await createCasePayment(id, {
        parcelas: selectedOption.parcelas,
        method,
        pricing_config_version: estimate?.pricing_config_version,
        expected_total_cents: selectedOption.valor_total_cents, // PRC-02
        idempotency_key: idempotencyKey
      });
      router.push(`/cases/${id}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setConflictMessage(errorMessage(err, "Este caso já tem um pagamento registrado, ou outra confirmação aconteceu ao mesmo tempo."));
      } else {
        setSubmitError(
          errorMessage(err, "Não foi possível registrar o pagamento.")
        );
      }
      setSubmitting(false);
    }
  }

  async function handleGeneratePix() {
    if (submitting || pixCharge) return;
    setSubmitting(true);
    setSubmitError("");
    setConflictMessage(null);
    try {
      const charge = await createPixCharge(id, idempotencyKey);
      setPixCharge(charge);
      setPixStatus(charge.status);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setConflictMessage(errorMessage(err, "Já existe uma cobrança para este caso, ou o pagamento já foi processado."));
      } else {
        setSubmitError(
          errorMessage(err, "Não foi possível gerar a cobrança Pix.")
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Dev-only (mock): dispara o webhook assinado do mock. A confirmação ainda vem do
  // backend — o polling reflete o PAID que o webhook gravou (o cliente não confirma).
  async function handleSimulatePix() {
    if (pixSimulating) return;
    setPixSimulating(true);
    try {
      await simulatePixPaid(id);
      const st = await getPixStatus(id);
      setPixStatus(st.status);
    } catch (err) {
      setSubmitError(errorMessage(err, "Não foi possível simular o pagamento."));
    } finally {
      setPixSimulating(false);
    }
  }

  // Cartão (mock dev-only): tokeniza no cliente e envia SÓ token/last4/brand/holder.
  // O objeto `card` cru NUNCA é logado, serializado nem persistido; qualquer erro
  // (incl. de tokenização) vira mensagem genérica — jamais o erro cru.
  async function handleCardSubmit(card: RawCard): Promise<boolean> {
    // Cartão de crédito e de débito compartilham este fluxo (débito é um cartão).
    if (submitting || !selectedOption || !isCardMethod(method)) return false;
    setSubmitting(true);
    setSubmitError("");
    setConflictMessage(null);
    // C3-06: tokenização (cartão) e registro (backend) em try SEPARADOS. Assim "confira o
    // cartão" só aparece quando o erro é REALMENTE da validação do cartão; um 500/400/402 do
    // backend mostra a mensagem real do backend (como o Pix), não uma culpa falsa ao cartão.
    let tok;
    try {
      tok = await tokenizeCard(card);
    } catch {
      setSubmitError("Não foi possível validar o cartão. Confira os dados e tente novamente.");
      setSubmitting(false);
      return false;
    }
    try {
      await createCasePayment(id, {
        parcelas: selectedOption.parcelas,
        method,
        pricing_config_version: estimate?.pricing_config_version,
        expected_total_cents: selectedOption.valor_total_cents, // PRC-02
        idempotency_key: idempotencyKey,
        card_token: tok.token,
        card_last4: tok.last4,
        card_brand: tok.brand,
        card_holder: card.holder
      });
      router.push(`/cases/${id}`);
      return true;
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setConflictMessage(errorMessage(err, "Este caso já tem um pagamento registrado, ou outra confirmação aconteceu ao mesmo tempo."));
      } else {
        setSubmitError(errorMessage(err, "Não foi possível registrar o pagamento."));
      }
      setSubmitting(false);
      return false;
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <AppLayout>
          <LoadingState
            description="Consultando o caso e as opções de parcelamento."
            label="Carregando pagamento"
            rows={3}
          />
        </AppLayout>
      </AuthGuard>
    );
  }

  if (!aggregate) {
    return (
      <AuthGuard>
        <AppLayout>
          <ErrorState
            action={
              <>
                <Button onClick={() => void load()} variant="secondary">
                  Tentar novamente
                </Button>
                <Button href="/cases" variant="secondary">
                  Voltar para casos
                </Button>
              </>
            }
            description="Não foi possível carregar o caso para pagamento."
            details={loadError || undefined}
            title="Pagamento indisponível"
          />
        </AppLayout>
      </AuthGuard>
    );
  }

  if (aggregateSource === "mock") {
    return (
      <AuthGuard>
        <AppLayout>
          <ErrorState
            action={
              <Button href={`/cases/${id}`} variant="secondary">
                Voltar ao caso
              </Button>
            }
            description="Este caso existe apenas no fallback local. O pagamento exige a API local ativa — sem fallback, por regra do fluxo de pagamento."
            title="Pagamento indisponível no fallback local"
          />
        </AppLayout>
      </AuthGuard>
    );
  }

  const caseData = aggregate.case;

  // Caso SEM pedido associado (request === null): não há valor nem plano a pagar.
  // Sem esta guarda a tela mostrava "R$ 0,00" + "Confirmar pagamento" ativo, e o
  // backend respondia 409 "Caso sem pedido associado". Estado vazio explícito.
  if (aggregate.request === null) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="mx-auto max-w-3xl">
            <Link
              className="pressable mb-4 flex items-center gap-1.5 text-xs text-[var(--text2)] transition hover:text-[var(--teal)]"
              href={`/cases/${id}`}
            >
              <ArrowLeft size={14} />
              Voltar ao caso
            </Link>
            <PageTitle
              description={`${caseData.code} · ${caseDisplayTitle(caseData)}`}
              eyebrow="Pagamento"
              title="Concluir pagamento"
            />
            <EmptyState
              action={<Button href={`/cases/${id}`}>Voltar ao caso</Button>}
              description="Este caso não tem um pedido associado, então não há valor nem plano de parcelamento a pagar. Pedidos com cobrança são criados pelo fluxo de Novo Pedido."
              icon={<FileQuestion size={18} />}
              title="Nenhum pedido para pagar"
            />
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  const alreadyRegistered = aggregate.paymentStatus !== "pending";

  return (
    <AuthGuard>
      <AppLayout>
        <div className="mx-auto max-w-3xl">
          <Link
            className="mb-4 flex items-center gap-1.5 text-xs text-[var(--text2)] transition hover:text-[var(--teal)]"
            href={`/cases/${id}`}
          >
            <ArrowLeft size={14} />
            Voltar ao caso
          </Link>

          <PageTitle
            description={`${caseData.code} · ${caseDisplayTitle(caseData)}`}
            eyebrow="Pagamento"
            title="Concluir pagamento"
          />

          {alreadyRegistered ? (
            <Card>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--teal)]" size={20} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text)]">
                    Pagamento já registrado
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
                    Status:{" "}
                    {PAYMENT_STATUS_LABELS[aggregate.paymentStatus] ??
                      aggregate.paymentStatus}
                    {aggregate.installmentPlan &&
                      ` · ${aggregate.installmentPlan.parcelas}x no ${
                        METHOD_LABELS[aggregate.installmentPlan.method] ??
                        aggregate.installmentPlan.method
                      } · total ${centsToReaisLabel(
                        aggregate.installmentPlan.valorTotalCents
                      )}`}
                    . O plano completo está no detalhe do caso.
                  </p>
                  <div className="mt-4">
                    <Button href={`/cases/${id}`}>Voltar ao caso</Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {estimate?.payment_mode === "mock" && (
                <Notification title="Ambiente de simulação" tone="warning">
                  Pagamento simulado para testes. Nenhuma cobrança real será
                  gerada.
                </Notification>
              )}

              {conflictMessage && (
                <Notification
                  actions={
                    <>
                      <Button onClick={() => void load()} size="sm" variant="secondary">
                        Recarregar
                      </Button>
                      <Button href={`/cases/${id}`} size="sm" variant="secondary">
                        Ver caso
                      </Button>
                    </>
                  }
                  title="Confirmação não concluída"
                  tone="warning"
                >
                  {conflictMessage}
                  {/[.!?]$/.test(conflictMessage) ? "" : "."} Recarregue para ver o
                  estado atual antes de confirmar.
                </Notification>
              )}

              {submitError && (
                <Notification
                  onDismiss={() => setSubmitError("")}
                  title="Falha ao registrar pagamento"
                  tone="error"
                >
                  {submitError}
                </Notification>
              )}

              {pixCharge ? (
                <PixChargePanel
                  amountCents={estimate?.total_price_cents ?? 0}
                  charge={pixCharge}
                  isMock={estimate?.payment_mode === "mock"}
                  onBack={() => router.push(`/cases/${id}`)}
                  onSimulate={
                    estimate?.payment_mode === "mock"
                      ? () => void handleSimulatePix()
                      : undefined
                  }
                  orderCode={caseData.code}
                  simulating={pixSimulating}
                  status={pixStatus ?? pixCharge.status}
                />
              ) : !estimate || options.length === 0 ? (
                <ErrorState
                  action={
                    <Button onClick={() => void load()} variant="secondary">
                      Tentar novamente
                    </Button>
                  }
                  description="Nenhuma opção de parcelamento foi retornada pelo servidor."
                  details={loadError || undefined}
                  title="Opções indisponíveis"
                />
              ) : (
                <>
                  {/* Total */}
                  <Card>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[rgba(32,201,151,0.22)] bg-[var(--teal-dim)] text-[var(--teal)]">
                        <Wallet size={16} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text2)]">
                          Total do pedido
                        </p>
                        <p className="font-mono text-lg font-bold text-[var(--text)]">
                          {centsToReaisLabel(estimate.total_price_cents)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] leading-4 text-[var(--text3)]">
                      O valor final é recalculado pelo servidor no momento da
                      confirmação, a partir do total do caso.
                    </p>
                  </Card>

                  {/* Options — o débito é sempre à vista (1x), então o seletor
                      de parcelamento fica oculto quando ele está selecionado. */}
                  {method !== "debito" && (
                  <Card
                    description="Escolha em quantas vezes deseja pagar."
                    title="Parcelamento"
                  >
                    <div className="space-y-2">
                      {options.map((option, index) => {
                        const active = option.parcelas === selectedParcelas;
                        return (
                          <button
                            aria-pressed={active}
                            className={`animate-in pressable flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left transition ${
                              active
                                ? "border-[rgba(32,201,151,0.45)] bg-[var(--teal-dim)]"
                                : "border-[var(--bd)] bg-[var(--surf2)] hover:border-[var(--bd2)]"
                            }`}
                            key={option.parcelas}
                            onClick={() => handleSelectOption(option)}
                            style={{ animationDelay: `${index * 40}ms` }}
                            type="button"
                          >
                            <span>
                              <span className="block text-sm font-semibold text-[var(--text)]">
                                <span className="font-mono">{option.parcelas}</span>x de{" "}
                                <span className="font-mono">
                                  {centsToReaisLabel(option.valor_parcela_cents)}
                                </span>
                              </span>
                              <span className="mt-0.5 block text-[11px] text-[var(--text2)]">
                                {option.has_juros ? (
                                  <>
                                    juros de{" "}
                                    <span className="font-mono">
                                      {jurosLabel(option.juros_mensal_bps)}
                                    </span>{" "}
                                    · acréscimo{" "}
                                    <span className="font-mono">
                                      {centsToReaisLabel(option.acrescimo_cents)}
                                    </span>
                                  </>
                                ) : (
                                  "sem juros"
                                )}
                              </span>
                            </span>
                            <span className="text-xs font-medium text-[var(--text2)]">
                              total{" "}
                              <span className="font-mono">
                                {centsToReaisLabel(option.valor_total_cents)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                  )}

                  {/* Method */}
                  {selectedOption && (
                    <Card
                      description="Somente os métodos permitidos para a opção escolhida."
                      title="Método de pagamento"
                    >
                      <div className="flex flex-wrap gap-2">
                        {selectedOption.allowed_methods
                          .filter(isPaymentMethod)
                          .map((allowedMethod, index) => {
                            const active = method === allowedMethod;
                            return (
                              <button
                                aria-pressed={active}
                                className={`animate-in pressable inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                                  active
                                    ? "border-[rgba(32,201,151,0.45)] bg-[var(--teal-dim)] text-[var(--teal)]"
                                    : "border-[var(--bd)] bg-[var(--surf2)] text-[var(--text2)] hover:border-[var(--bd2)]"
                                }`}
                                key={allowedMethod}
                                onClick={() => {
                                  setMethod(allowedMethod);
                                  setSubmitError("");
                                  // Débito é à vista: trava o plano em 1x.
                                  if (allowedMethod === "debito") {
                                    setSelectedParcelas(1);
                                  }
                                }}
                                style={{ animationDelay: `${index * 40}ms` }}
                                type="button"
                              >
                                <CreditCard size={14} />
                                {METHOD_LABELS[allowedMethod]}
                              </button>
                            );
                          })}
                      </div>
                    </Card>
                  )}

                  {/* Schedule */}
                  {selectedOption && (
                    <Card
                      description="Vencimentos e valores de cada parcela."
                      title={
                        <span className="flex items-center gap-2">
                          <CalendarClock size={16} style={{ color: "var(--accent)" }} />
                          Cronograma
                        </span>
                      }
                    >
                      <div className="space-y-2">
                        {selectedOption.schedule.map((item, index) => (
                          <div
                            className="animate-in flex items-center justify-between gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-2 text-xs"
                            key={item.numero}
                            style={{ animationDelay: `${index * 40}ms` }}
                          >
                            <span className="text-[var(--text2)]">
                              Parcela <span className="font-mono">{item.numero}</span>
                            </span>
                            <span className="font-mono text-[var(--text2)]">
                              {formatDueDate(item.vencimento)}
                            </span>
                            <span className="font-mono font-semibold text-[var(--text)]">
                              {centsToReaisLabel(item.valor_cents)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Confirm */}
                  {selectedOption &&
                  isCardMethod(method) &&
                  estimate.payment_mode === "mock" ? (
                    <CreditCardForm
                      onSubmit={handleCardSubmit}
                      parcelasLabel={`${selectedOption.parcelas}x · total ${centsToReaisLabel(
                        selectedOption.valor_total_cents
                      )}`}
                      submitting={submitting}
                    />
                  ) : (
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        disabled={!selectedOption || !method || submitting}
                        icon={<CheckCircle2 aria-hidden="true" size={16} />}
                        loading={submitting}
                        onClick={() =>
                          method === "pix"
                            ? void handleGeneratePix()
                            : void handleConfirm()
                        }
                      >
                        {submitting
                          ? method === "pix"
                            ? "Gerando cobrança..."
                            : "Registrando..."
                          : method === "pix"
                            ? "Gerar cobrança Pix"
                            : "Confirmar pagamento"}
                      </Button>
                      {estimate.payment_mode === "mock" && (
                        <p className="text-[11px] text-[var(--text3)]">
                          Pagamento simulado para testes. Nenhuma cobrança real
                          será gerada.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
