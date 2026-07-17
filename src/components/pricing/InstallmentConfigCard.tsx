"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";

import { Card } from "@/components/Card";
import { CurrencyInput } from "@/components/CurrencyInput";
import { FormField, TextInput } from "@/components/FormField";
import { Notification } from "@/components/Notification";
import { Switch } from "@/components/Switch";
import { METHOD_LABELS, METHOD_ORDER } from "@/lib/paymentMethods";
import { bpsToPercentLabel, parsePercentToBps } from "@/lib/percentBps";
import type { InstallmentConfig, MethodRule } from "@/services/pricing";
import type { PaymentMethod } from "@/types";

const MAX_PARCELAS_LIMIT = 24;

const DEFAULT_CONFIG: InstallmentConfig = {
  enabled: false,
  max_parcelas: 1,
  sem_juros_ate: 1,
  juros_mensal_bps: 0,
  valor_minimo_parcela_cents: 0,
  primeiro_vencimento_dias: 30,
  dia_vencimento: null,
  allowed_methods: {}
};

/**
 * Preenche defaults e materializa os métodos (pix/boleto/cartão de crédito/
 * cartão de débito) a partir do installment_config do backend. Espelha a
 * semântica do domínio: allowed_methods vazio equivale a Pix/Boleto/Débito 1x
 * + Cartão de crédito até max_parcelas.
 */
export function normalizeInstallmentConfig(
  raw?: Partial<InstallmentConfig> | null
): InstallmentConfig {
  const merged: InstallmentConfig = {
    enabled: raw?.enabled ?? DEFAULT_CONFIG.enabled,
    max_parcelas: raw?.max_parcelas ?? DEFAULT_CONFIG.max_parcelas,
    sem_juros_ate: raw?.sem_juros_ate ?? DEFAULT_CONFIG.sem_juros_ate,
    juros_mensal_bps: raw?.juros_mensal_bps ?? DEFAULT_CONFIG.juros_mensal_bps,
    valor_minimo_parcela_cents:
      raw?.valor_minimo_parcela_cents ?? DEFAULT_CONFIG.valor_minimo_parcela_cents,
    primeiro_vencimento_dias:
      raw?.primeiro_vencimento_dias ?? DEFAULT_CONFIG.primeiro_vencimento_dias,
    dia_vencimento: raw?.dia_vencimento ?? DEFAULT_CONFIG.dia_vencimento,
    allowed_methods: {}
  };

  const rawMethods = raw?.allowed_methods ?? {};
  const hasExplicitMethods = Object.keys(rawMethods).length > 0;
  const methods: Record<string, MethodRule> = {};
  for (const key of METHOD_ORDER) {
    const rule = rawMethods[key];
    // Só o cartão de crédito parcela — Pix/Boleto/Débito são sempre 1x (à vista).
    if (hasExplicitMethods) {
      methods[key] = rule
        ? {
            enabled: rule.enabled,
            max_parcelas: key === "cartao" ? rule.max_parcelas : 1
          }
        : { enabled: false, max_parcelas: 1 };
    } else {
      methods[key] = {
        enabled: true,
        max_parcelas: key === "cartao" ? merged.max_parcelas : 1
      };
    }
  }

  return { ...merged, allowed_methods: methods };
}

type IntFieldProps = {
  value: number | null;
  min: number;
  max: number;
  onCommit: (value: number | null) => void;
  allowEmpty?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
};

/**
 * Input inteiro controlado com "rascunho" local enquanto digita (sem efeitos):
 * fora de foco o valor exibido deriva da prop, então reset externo funciona.
 */
function IntField({
  value,
  min,
  max,
  onCommit,
  allowEmpty = false,
  id,
  className,
  disabled,
  placeholder,
  "aria-label": ariaLabel
}: IntFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (value === null ? "" : String(value));

  return (
    <TextInput
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      id={id}
      inputMode="numeric"
      max={max}
      min={min}
      onBlur={() => setDraft(null)}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        if (raw === "") {
          if (allowEmpty) onCommit(null);
          return;
        }
        const parsed = parseInt(raw, 10);
        if (!Number.isNaN(parsed)) {
          onCommit(Math.min(max, Math.max(min, parsed)));
        }
      }}
      placeholder={placeholder}
      type="number"
      value={display}
    />
  );
}

type PercentFieldProps = {
  bps: number;
  onCommit: (bps: number) => void;
  id?: string;
};

function PercentField({ bps, onCommit, id }: PercentFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? bpsToPercentLabel(bps);

  return (
    <div className="relative">
      <TextInput
        className="pr-8"
        id={id}
        inputMode="decimal"
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const parsed = parsePercentToBps(raw);
          if (parsed !== null) {
            onCommit(parsed);
          } else if (raw.trim() === "") {
            onCommit(0);
          }
        }}
        placeholder="0"
        type="text"
        value={display}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text3)]">
        %
      </span>
    </div>
  );
}

type InstallmentConfigCardProps = {
  value: InstallmentConfig;
  onChange: (config: InstallmentConfig) => void;
  paymentMode: string;
};

export function InstallmentConfigCard({
  value,
  onChange,
  paymentMode
}: InstallmentConfigCardProps) {
  const patch = (partial: Partial<InstallmentConfig>) =>
    onChange({ ...value, ...partial });

  const setMaxParcelas = (max: number) => {
    const methods = Object.fromEntries(
      Object.entries(value.allowed_methods).map(([key, rule]) => [
        key,
        { ...rule, max_parcelas: Math.min(rule.max_parcelas, max) }
      ])
    );
    onChange({
      ...value,
      max_parcelas: max,
      sem_juros_ate: Math.min(value.sem_juros_ate, max),
      allowed_methods: methods
    });
  };

  const setMethodRule = (key: PaymentMethod, partial: Partial<MethodRule>) => {
    const current = value.allowed_methods[key] ?? { enabled: false, max_parcelas: 1 };
    onChange({
      ...value,
      allowed_methods: {
        ...value.allowed_methods,
        [key]: { ...current, ...partial }
      }
    });
  };

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <CreditCard size={18} style={{ color: "var(--teal)" }} />
          Parcelamento
        </span>
      }
      description="Configure as opções de parcelamento ofertadas na tela de pagamento do caso."
    >
      {paymentMode === "mock" && (
        <Notification compact tone="warning">
          Pagamento simulado para testes. Nenhuma cobrança real será gerada.
        </Notification>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] p-3">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
              Parcelamento habilitado
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>
              Desabilitado, os pedidos são cobrados apenas à vista (1x).
            </p>
          </div>
          <Switch
            checked={value.enabled}
            label="Habilitar parcelamento"
            onCheckedChange={(checked) => patch({ enabled: checked })}
          />
        </div>

        {value.enabled && (
          <>
            <div className="space-y-4">
              {/* Grupo 1 — parcelas e juros */}
              <div>
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--teal)]">
                  Parcelas e juros
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    hint={`De 1 a ${MAX_PARCELAS_LIMIT} parcelas.`}
                    htmlFor="inst-max-parcelas"
                    label="Máximo de parcelas"
                  >
                    <IntField
                      id="inst-max-parcelas"
                      max={MAX_PARCELAS_LIMIT}
                      min={1}
                      onCommit={(n) => setMaxParcelas(n ?? 1)}
                      value={value.max_parcelas}
                    />
                  </FormField>
                  <FormField
                    hint="Parcelas até este número não têm juros."
                    htmlFor="inst-sem-juros-ate"
                    label="Sem juros até"
                  >
                    <IntField
                      id="inst-sem-juros-ate"
                      max={value.max_parcelas}
                      min={1}
                      onCommit={(n) => patch({ sem_juros_ate: n ?? 1 })}
                      value={value.sem_juros_ate}
                    />
                  </FormField>
                  <FormField
                    hint="Aplicado às parcelas acima do limite sem juros."
                    htmlFor="inst-juros"
                    label="Juros mensal (%)"
                  >
                    <PercentField
                      bps={value.juros_mensal_bps}
                      id="inst-juros"
                      onCommit={(bps) => patch({ juros_mensal_bps: bps })}
                    />
                  </FormField>
                </div>
              </div>

              {/* Grupo 2 — valores e vencimento */}
              <div>
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--teal)]">
                  Valores e vencimento
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    hint="Opções com parcela abaixo deste valor não são ofertadas."
                    htmlFor="inst-parcela-minima"
                    label="Parcela mínima"
                  >
                    <CurrencyInput
                      className="w-full"
                      id="inst-parcela-minima"
                      onChange={(cents) =>
                        patch({ valor_minimo_parcela_cents: cents ?? 0 })
                      }
                      value={value.valor_minimo_parcela_cents}
                    />
                  </FormField>
                  <FormField
                    hint="Dias após a confirmação (0 a 365)."
                    htmlFor="inst-primeiro-vencimento"
                    label="1º vencimento (dias)"
                  >
                    <IntField
                      id="inst-primeiro-vencimento"
                      max={365}
                      min={0}
                      onCommit={(n) => patch({ primeiro_vencimento_dias: n ?? 30 })}
                      value={value.primeiro_vencimento_dias}
                    />
                  </FormField>
                  <FormField
                    hint="Opcional (1 a 28). Vazio usa a data corrida."
                    htmlFor="inst-dia-vencimento"
                    label="Dia fixo de vencimento"
                  >
                    <IntField
                      allowEmpty
                      id="inst-dia-vencimento"
                      max={28}
                      min={1}
                      onCommit={(n) => patch({ dia_vencimento: n })}
                      placeholder="Sem dia fixo"
                      value={value.dia_vencimento}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                Métodos de pagamento
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>
                Cada método pode limitar o próprio número máximo de parcelas.
              </p>
              <div className="mt-3 space-y-2">
                {METHOD_ORDER.map((key, index) => {
                  const rule =
                    value.allowed_methods[key] ?? { enabled: false, max_parcelas: 1 };
                  return (
                    <div
                      // Motion: entrada escalonada das linhas de método.
                      className="animate-in flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-2"
                      style={{ animationDelay: `${index * 40}ms` }}
                      key={key}
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.enabled}
                          label={`Habilitar ${METHOD_LABELS[key]}`}
                          onCheckedChange={(checked) =>
                            setMethodRule(key, { enabled: checked })
                          }
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text)" }}
                        >
                          {METHOD_LABELS[key]}
                        </span>
                      </div>
                      {key === "cartao" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "var(--text2)" }}>
                            Máx. parcelas
                          </span>
                          <IntField
                            aria-label={`Máximo de parcelas no ${METHOD_LABELS[key]}`}
                            className="w-20"
                            disabled={!rule.enabled}
                            max={value.max_parcelas}
                            min={1}
                            onCommit={(n) =>
                              setMethodRule(key, { max_parcelas: n ?? 1 })
                            }
                            value={rule.max_parcelas}
                          />
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text2)" }}>
                          À vista (1x)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
