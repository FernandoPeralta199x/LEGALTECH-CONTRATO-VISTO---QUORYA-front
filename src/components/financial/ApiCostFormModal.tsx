"use client";

import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/Button";
import { CurrencyInput, centsToReaisLabel } from "@/components/CurrencyInput";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/FormField";
import { useModalA11y } from "@/lib/useModalA11y";
import type { CreateApiCostPayload } from "@/services/apiCosts";

const PROVIDERS = [
  "Serasa",
  "SPC",
  "Receita (CPF/CNPJ)",
  "Consulta processual",
  "Escavador",
  "OCR",
  "IA/LLM",
  "Embeddings",
  "E-mail transacional",
  "Outro"
];

type Errors = Partial<
  Record<"providerOther" | "operation" | "quantity" | "unit" | "date", string>
>;

export function ApiCostFormModal({
  open,
  onClose,
  onSubmit,
  submitting
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateApiCostPayload) => Promise<void>;
  submitting: boolean;
}) {
  const dialogRef = useModalA11y<HTMLDivElement>(open, onClose);
  const [providerSel, setProviderSel] = useState(PROVIDERS[0]);
  const [providerOther, setProviderOther] = useState("");
  const [operation, setOperation] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCents, setUnitCents] = useState<number | null>(null);
  const [status, setStatus] = useState<"processado" | "previsto">("processado");
  const [incurredAt, setIncurredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  // Reseta o formulário ao (re)abrir — não reaproveita o lançamento anterior
  // (evita registro duplicado por engano).
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setProviderSel(PROVIDERS[0]);
    setProviderOther("");
    setOperation("");
    setQuantity("1");
    setUnitCents(null);
    setStatus("processado");
    setIncurredAt("");
    setNotes("");
    setErrors({});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  if (!open) {
    return null;
  }

  const provider = providerSel === "Outro" ? providerOther.trim() : providerSel;
  const qtyNum = Number(quantity);
  const qtyValid = Number.isInteger(qtyNum) && qtyNum >= 1;
  const totalCents = unitCents !== null && qtyValid ? unitCents * qtyNum : null;
  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD no fuso local

  function validate(): boolean {
    const e: Errors = {};
    if (providerSel === "Outro" && !providerOther.trim()) e.providerOther = "Informe o provedor";
    if (!operation.trim()) e.operation = "Informe o serviço/operação";
    if (!qtyValid) e.quantity = "Quantidade inteira ≥ 1";
    if (unitCents === null || unitCents < 0) e.unit = "Informe o custo unitário";
    if (incurredAt && incurredAt > todayStr) e.date = "A data não pode ser futura";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting || !validate()) {
      return;
    }
    await onSubmit({
      provider,
      operation: operation.trim(),
      quantity: qtyNum,
      unit_cost_cents: unitCents as number,
      status,
      incurred_at: incurredAt || null,
      notes: notes.trim() || null
    });
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm"
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          aria-labelledby="api-cost-modal-title"
          aria-modal="true"
          className="cv-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
          ref={dialogRef}
          role="dialog"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2
              className="text-base font-semibold text-[var(--text)]"
              id="api-cost-modal-title"
            >
              Novo gasto de API
            </h2>
            <button
              aria-label="Fechar"
              className="cv-icon-btn"
              onClick={onClose}
              type="button"
            >
              <X size={16} />
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <FormField label="Provedor" required>
              <SelectInput
                onChange={(e) => setProviderSel(e.target.value)}
                value={providerSel}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            {providerSel === "Outro" && (
              <FormField error={errors.providerOther} label="Provedor (especifique)" required>
                <TextInput
                  invalid={Boolean(errors.providerOther)}
                  maxLength={80}
                  onChange={(e) => setProviderOther(e.target.value)}
                  placeholder="Ex.: TargetData"
                  value={providerOther}
                />
              </FormField>
            )}

            <FormField error={errors.operation} label="Serviço / operação" required>
              <TextInput
                invalid={Boolean(errors.operation)}
                maxLength={120}
                onChange={(e) => setOperation(e.target.value)}
                placeholder="Ex.: Consulta CPF"
                value={operation}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField error={errors.quantity} label="Quantidade" required>
                <TextInput
                  inputMode="numeric"
                  invalid={Boolean(errors.quantity)}
                  onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ""))}
                  value={quantity}
                />
              </FormField>

              <FormField error={errors.unit} label="Custo unitário" required>
                <CurrencyInput
                  aria-label="Custo unitário"
                  invalid={Boolean(errors.unit)}
                  onChange={setUnitCents}
                  value={unitCents}
                />
              </FormField>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-2.5">
              <span className="text-xs text-[var(--text2)]">Custo total (calculado)</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-[var(--text)]">
                {centsToReaisLabel(totalCents)}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Status" required>
                <SelectInput
                  onChange={(e) => setStatus(e.target.value as "processado" | "previsto")}
                  value={status}
                >
                  <option value="processado">Processado (custo real)</option>
                  <option value="previsto">Previsto (estimativa)</option>
                </SelectInput>
              </FormField>

              <FormField error={errors.date} label="Data do gasto">
                <TextInput
                  invalid={Boolean(errors.date)}
                  max={todayStr}
                  onChange={(e) => setIncurredAt(e.target.value)}
                  type="date"
                  value={incurredAt}
                />
              </FormField>
            </div>

            <FormField hint="Opcional" label="Observações">
              <TextArea
                maxLength={500}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nota administrativa (fatura, referência...)"
                value={notes}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-1">
              <Button disabled={submitting} onClick={onClose} type="button" variant="secondary">
                Cancelar
              </Button>
              <Button loading={submitting} type="submit" variant="primary">
                Registrar gasto
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
