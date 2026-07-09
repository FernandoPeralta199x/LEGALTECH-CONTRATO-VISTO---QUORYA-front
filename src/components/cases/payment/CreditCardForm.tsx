"use client";

import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormField, TextInput } from "@/components/FormField";
import { Notification } from "@/components/Notification";
import { isValidCpf, maskCpf } from "@/lib/cpfCnpj";
import {
  luhnValid,
  validExp,
  type RawCard
} from "@/services/payment/tokenize";

type CreditCardFormProps = {
  /** Recebe o cartão cru, tokeniza/cobra e resolve `true` no sucesso (limpa o form),
   *  `false` no erro (mantém os campos para nova tentativa). */
  onSubmit: (card: RawCard) => Promise<boolean>;
  submitting: boolean;
  parcelasLabel: string;
};

/** #### #### #### #### (até 16 dígitos, agrupados de 4 em 4). */
function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

/** MM/AA a partir dos dígitos. */
function maskExp(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Só dígitos, 3–4 posições. */
function maskCvv(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function CreditCardForm({
  onSubmit,
  submitting,
  parcelasLabel
}: CreditCardFormProps) {
  // Estado dos dados crus vive SÓ neste componente e é limpo após submeter.
  // NUNCA é logado, serializado (JSON.stringify) nem persistido (local/sessionStorage).
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [holder, setHolder] = useState("");
  const [cpf, setCpf] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const digits = number.replace(/\D/g, "");
    if (!digits) {
      e.number = "Informe o número do cartão.";
    } else if (!luhnValid(digits)) {
      e.number = "Número de cartão inválido.";
    }
    if (!exp.trim()) {
      e.exp = "Informe a validade.";
    } else if (!validExp(exp)) {
      e.exp = "Validade inválida ou vencida.";
    }
    if (!/^\d{3,4}$/.test(cvv.trim())) {
      e.cvv = "CVV deve ter 3 ou 4 dígitos.";
    }
    if (!holder.trim()) {
      e.holder = "Informe o nome do titular.";
    }
    if (!cpf.trim()) {
      e.cpf = "Informe o CPF do titular.";
    } else if (!isValidCpf(cpf)) {
      e.cpf = "CPF inválido.";
    }
    return e;
  }, [number, exp, cvv, holder, cpf]);

  const isValid = Object.keys(errors).length === 0;

  function setError(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !isValid) {
      setTouched({ number: true, exp: true, cvv: true, holder: true, cpf: true });
      return;
    }
    const card: RawCard = {
      number,
      exp,
      cvv,
      holder: holder.trim(),
      cpf
    };
    const ok = await onSubmit(card);
    // Limpa os dados crus SÓ no sucesso; em erro (ex.: 400/rede) preserva os campos
    // para o usuário tentar de novo sem redigitar o cartão inteiro.
    if (ok) {
      setNumber("");
      setExp("");
      setCvv("");
      setHolder("");
      setCpf("");
      setTouched({});
    }
  }

  return (
    <Card
      description="Preencha os dados do cartão para simular a cobrança."
      title={
        <span className="flex items-center gap-2">
          <CreditCard size={16} style={{ color: "var(--accent)" }} />
          Dados do cartão
        </span>
      }
    >
      <Notification compact tone="warning">
        Pagamento simulado — ambiente de desenvolvimento. Os dados do cartão não
        são enviados ao servidor nem armazenados.
      </Notification>

      <form autoComplete="on" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField
              error={touched.number ? errors.number : undefined}
              label="Número do cartão"
              required
            >
              <TextInput
                autoComplete="cc-number"
                inputMode="numeric"
                invalid={touched.number && Boolean(errors.number)}
                onBlur={() => setError("number")}
                onChange={(e) => setNumber(maskCardNumber(e.target.value))}
                placeholder="0000 0000 0000 0000"
                value={number}
              />
            </FormField>
          </div>

          <FormField
            error={touched.exp ? errors.exp : undefined}
            label="Validade (MM/AA)"
            required
          >
            <TextInput
              autoComplete="cc-exp"
              inputMode="numeric"
              invalid={touched.exp && Boolean(errors.exp)}
              onBlur={() => setError("exp")}
              onChange={(e) => setExp(maskExp(e.target.value))}
              placeholder="MM/AA"
              value={exp}
            />
          </FormField>

          <FormField
            error={touched.cvv ? errors.cvv : undefined}
            label="CVV"
            required
          >
            <TextInput
              autoComplete="cc-csc"
              inputMode="numeric"
              invalid={touched.cvv && Boolean(errors.cvv)}
              onBlur={() => setError("cvv")}
              onChange={(e) => setCvv(maskCvv(e.target.value))}
              placeholder="000"
              value={cvv}
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField
              error={touched.holder ? errors.holder : undefined}
              label="Nome do titular"
              required
            >
              <TextInput
                autoComplete="cc-name"
                invalid={touched.holder && Boolean(errors.holder)}
                onBlur={() => setError("holder")}
                onChange={(e) => setHolder(e.target.value)}
                placeholder="Como impresso no cartão"
                value={holder}
              />
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField
              error={touched.cpf ? errors.cpf : undefined}
              label="CPF do titular"
              required
            >
              <TextInput
                autoComplete="off"
                inputMode="numeric"
                invalid={touched.cpf && Boolean(errors.cpf)}
                onBlur={() => setError("cpf")}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                placeholder="000.000.000-00"
                value={cpf}
              />
            </FormField>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-end gap-2">
          <Button
            disabled={!isValid || submitting}
            icon={<CheckCircle2 aria-hidden="true" size={16} />}
            loading={submitting}
            type="submit"
          >
            {submitting ? "Processando..." : `Pagar ${parcelasLabel}`}
          </Button>
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--text3)]">
            <ShieldCheck aria-hidden="true" size={12} />
            Simulação local. Nenhum dado de cartão é transmitido ou persistido.
          </p>
        </div>
      </form>
    </Card>
  );
}
