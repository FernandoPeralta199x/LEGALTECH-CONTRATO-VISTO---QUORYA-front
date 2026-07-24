"use client";

import { Info, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/Button";
import { CurrencyInput, centsToReaisLabel } from "@/components/CurrencyInput";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/FormField";
import { useModalA11y } from "@/lib/useModalA11y";
import type { CreateTaxPayload, TaxStatus } from "@/services/taxes";

const TAX_TYPES: { value: string; label: string }[] = [
  { value: "iss", label: "ISS" },
  { value: "pis", label: "PIS" },
  { value: "cofins", label: "COFINS" },
  { value: "irpj", label: "IRPJ" },
  { value: "csll", label: "CSLL" },
  { value: "das", label: "Simples / DAS" },
  { value: "inss", label: "INSS" },
  { value: "icms", label: "ICMS" },
  { value: "outro", label: "Outro" }
];

const TAX_STATUS: { value: TaxStatus; label: string }[] = [
  { value: "estimado", label: "Estimado" },
  { value: "confirmado", label: "Confirmado (validado)" },
  { value: "divergente", label: "Divergente" },
  { value: "nao_aplicavel", label: "Não aplicável" }
];

type Errors = Partial<Record<"estimated" | "confirmed" | "competency", string>>;

export function TaxFormModal({
  open,
  onClose,
  onSubmit,
  submitting
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTaxPayload) => Promise<void>;
  submitting: boolean;
}) {
  const dialogRef = useModalA11y<HTMLDivElement>(open, onClose);
  const [taxType, setTaxType] = useState("iss");
  const [baseCents, setBaseCents] = useState<number | null>(null);
  const [estimatedCents, setEstimatedCents] = useState<number | null>(null);
  const [confirmedCents, setConfirmedCents] = useState<number | null>(null);
  const [status, setStatus] = useState<TaxStatus>("estimado");
  const [competency, setCompetency] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setTaxType("iss");
    setBaseCents(null);
    setEstimatedCents(null);
    setConfirmedCents(null);
    setStatus("estimado");
    setCompetency("");
    setNotes("");
    setErrors({});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  if (!open) {
    return null;
  }

  const todayMonth = new Date().toLocaleDateString("en-CA").slice(0, 7); // YYYY-MM local

  function validate(): boolean {
    const e: Errors = {};
    if (estimatedCents === null || estimatedCents < 0) e.estimated = "Informe o valor estimado";
    if ((status === "confirmado" || status === "divergente") && (confirmedCents === null || confirmedCents < 0)) {
      e.confirmed = "Valor confirmado é obrigatório para Confirmado/Divergente";
    }
    if (!competency) e.competency = "Informe a competência";
    else if (competency > todayMonth) e.competency = "A competência não pode ser futura";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting || !validate()) return;
    const [ano, mes] = competency.split("-").map((n) => Number(n));
    await onSubmit({
      tax_type: taxType,
      base_amount_cents: baseCents ?? 0,
      estimated_amount_cents: estimatedCents as number,
      confirmed_amount_cents: confirmedCents,
      status,
      competencia_ano: ano,
      competencia_mes: mes,
      notes: notes.trim() || null
    });
  }

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          aria-labelledby="tax-modal-title"
          aria-modal="true"
          className="cv-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
          ref={dialogRef}
          role="dialog"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text)]" id="tax-modal-title">
              Novo tributo
            </h2>
            <button aria-label="Fechar" className="cv-icon-btn" onClick={onClose} type="button">
              <X size={16} />
            </button>
          </div>

          <div className="mb-4 flex items-start gap-2 rounded-[var(--r-sm)] border border-[rgba(96,165,250,0.22)] bg-[var(--blue-dim)] p-3">
            <Info aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--blue)]" size={14} />
            <p className="text-[11px] leading-4 text-[var(--text2)]">
              Controle interno. Os valores são informativos — o sistema não calcula tributo por
              alíquota; digite o valor validado com o contador/integração fiscal.
            </p>
          </div>

          <form className="space-y-4" noValidate onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tipo de tributo" required>
                <SelectInput onChange={(e) => setTaxType(e.target.value)} value={taxType}>
                  {TAX_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </SelectInput>
              </FormField>

              <FormField error={errors.competency} label="Competência" required>
                <TextInput
                  invalid={Boolean(errors.competency)}
                  max={todayMonth}
                  onChange={(e) => setCompetency(e.target.value)}
                  type="month"
                  value={competency}
                />
              </FormField>
            </div>

            <FormField hint="Referência exibida — opcional" label="Base de cálculo">
              <CurrencyInput aria-label="Base de cálculo" onChange={setBaseCents} value={baseCents} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField error={errors.estimated} label="Valor estimado (provisionado)" required>
                <CurrencyInput
                  aria-label="Valor estimado"
                  invalid={Boolean(errors.estimated)}
                  onChange={setEstimatedCents}
                  value={estimatedCents}
                />
              </FormField>

              <FormField error={errors.confirmed} hint="Se validado" label="Valor confirmado">
                <CurrencyInput
                  aria-label="Valor confirmado"
                  invalid={Boolean(errors.confirmed)}
                  onChange={setConfirmedCents}
                  value={confirmedCents}
                />
              </FormField>
            </div>

            {confirmedCents !== null && estimatedCents !== null && (
              <div className="flex items-center justify-between rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-2.5">
                <span className="text-xs text-[var(--text2)]">Divergência (confirmado − estimado)</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-[var(--text)]">
                  {centsToReaisLabel(confirmedCents - estimatedCents)}
                </span>
              </div>
            )}

            <FormField label="Status" required>
              <SelectInput onChange={(e) => setStatus(e.target.value as TaxStatus)} value={status}>
                {TAX_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField hint="Opcional" label="Observações">
              <TextArea
                maxLength={500}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nota do contador, referência da guia..."
                value={notes}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-1">
              <Button disabled={submitting} onClick={onClose} type="button" variant="secondary">
                Cancelar
              </Button>
              <Button loading={submitting} type="submit" variant="primary">
                Registrar tributo
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
