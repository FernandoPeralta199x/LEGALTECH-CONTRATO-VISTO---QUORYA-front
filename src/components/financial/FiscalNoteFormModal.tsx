"use client";

import { Info, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/Button";
import { CurrencyInput } from "@/components/CurrencyInput";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/FormField";
import { useModalA11y } from "@/lib/useModalA11y";
import type { CreateNotePayload, FiscalNoteStatus } from "@/services/fiscalNotes";

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "nfse", label: "NFS-e (serviço)" },
  { value: "nfe", label: "NF-e (produto)" },
  { value: "nfce", label: "NFC-e" },
  { value: "recibo", label: "Recibo" },
  { value: "outro", label: "Outro" }
];

const DOC_STATUS: { value: FiscalNoteStatus; label: string }[] = [
  { value: "note_pending", label: "Pendente" },
  { value: "authorized", label: "Emitida / autorizada" },
  { value: "rejected", label: "Rejeitada" },
  { value: "note_canceled", label: "Cancelada" },
  { value: "not_required", label: "Sem nota" }
];

type Errors = Partial<
  Record<"numero" | "amount" | "date" | "reason" | "url", string>
>;

export function FiscalNoteFormModal({
  open,
  onClose,
  onSubmit,
  submitting
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateNotePayload) => Promise<void>;
  submitting: boolean;
}) {
  const dialogRef = useModalA11y<HTMLDivElement>(open, onClose);
  const [docType, setDocType] = useState("nfse");
  const [status, setStatus] = useState<FiscalNoteStatus>("note_pending");
  const [numero, setNumero] = useState("");
  const [serie, setSerie] = useState("");
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [taxCents, setTaxCents] = useState<number | null>(null);
  const [issueCostCents, setIssueCostCents] = useState<number | null>(null);
  const [issuedAt, setIssuedAt] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setDocType("nfse");
    setStatus("note_pending");
    setNumero("");
    setSerie("");
    setAmountCents(null);
    setTaxCents(null);
    setIssueCostCents(null);
    setIssuedAt("");
    setDocumentUrl("");
    setReason("");
    setNotes("");
    setErrors({});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  if (!open) {
    return null;
  }

  const todayStr = new Date().toLocaleDateString("en-CA");
  const needsReason = status === "rejected" || status === "note_canceled";

  function validate(): boolean {
    const e: Errors = {};
    if (status === "authorized" && !numero.trim()) e.numero = "Número é obrigatório para nota emitida";
    if (amountCents === null || amountCents < 0) e.amount = "Informe o valor da nota";
    if (issuedAt && issuedAt > todayStr) e.date = "A data não pode ser futura";
    if (status === "rejected" && !reason.trim()) e.reason = "Informe o motivo da rejeição";
    const url = documentUrl.trim().toLowerCase();
    if (url && !(url.startsWith("https://") || url.startsWith("s3://"))) {
      e.url = "Use uma URL https:// ou s3://";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting || !validate()) return;
    await onSubmit({
      doc_type: docType,
      status,
      numero: numero.trim() || null,
      serie: serie.trim() || null,
      amount_cents: amountCents as number,
      tax_amount_cents: taxCents ?? 0,
      issuance_cost_cents: issueCostCents ?? 0,
      issued_at: issuedAt || null,
      document_url: documentUrl.trim() || null,
      rejection_reason: needsReason ? reason.trim() || null : null,
      notes: notes.trim() || null
    });
  }

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          aria-labelledby="note-modal-title"
          aria-modal="true"
          className="cv-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
          ref={dialogRef}
          role="dialog"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text)]" id="note-modal-title">
              Nova nota fiscal
            </h2>
            <button aria-label="Fechar" className="cv-icon-btn" onClick={onClose} type="button">
              <X size={16} />
            </button>
          </div>

          <div className="mb-4 flex items-start gap-2 rounded-[var(--r-sm)] border border-[rgba(96,165,250,0.22)] bg-[var(--blue-dim)] p-3">
            <Info aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--blue)]" size={14} />
            <p className="text-[11px] leading-4 text-[var(--text2)]">
              O sistema não emite documento fiscal — apenas registra o que já foi emitido.
              Transcreva o número real gerado pelo provedor/prefeitura.
            </p>
          </div>

          <form className="space-y-4" noValidate onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tipo de nota" required>
                <SelectInput onChange={(e) => setDocType(e.target.value)} value={docType}>
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </SelectInput>
              </FormField>

              <FormField label="Status" required>
                <SelectInput
                  onChange={(e) => setStatus(e.target.value as FiscalNoteStatus)}
                  value={status}
                >
                  {DOC_STATUS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <FormField
                  error={errors.numero}
                  hint={status === "authorized" ? undefined : "Se já emitida"}
                  label="Número da nota"
                  required={status === "authorized"}
                >
                  <TextInput
                    invalid={Boolean(errors.numero)}
                    maxLength={60}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Ex.: 2026/000123"
                    value={numero}
                  />
                </FormField>
              </div>
              <FormField label="Série">
                <TextInput
                  maxLength={20}
                  onChange={(e) => setSerie(e.target.value)}
                  placeholder="1"
                  value={serie}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField error={errors.amount} label="Valor documentado" required>
                <CurrencyInput
                  aria-label="Valor documentado"
                  invalid={Boolean(errors.amount)}
                  onChange={setAmountCents}
                  value={amountCents}
                />
              </FormField>
              <FormField hint="Informativo" label="Tributos da nota">
                <CurrencyInput aria-label="Tributos da nota" onChange={setTaxCents} value={taxCents} />
              </FormField>
              <FormField label="Custo de emissão">
                <CurrencyInput
                  aria-label="Custo de emissão"
                  onChange={setIssueCostCents}
                  value={issueCostCents}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField error={errors.date} label="Data de emissão">
                <TextInput
                  invalid={Boolean(errors.date)}
                  max={todayStr}
                  onChange={(e) => setIssuedAt(e.target.value)}
                  type="date"
                  value={issuedAt}
                />
              </FormField>
              <FormField error={errors.url} hint="https:// ou s3://" label="Link do documento">
                <TextInput
                  invalid={Boolean(errors.url)}
                  maxLength={1000}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://..."
                  value={documentUrl}
                />
              </FormField>
            </div>

            {needsReason && (
              <FormField
                error={errors.reason}
                label={status === "rejected" ? "Motivo da rejeição" : "Motivo do cancelamento"}
                required={status === "rejected"}
              >
                <TextInput
                  invalid={Boolean(errors.reason)}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex.: CNPJ inválido"
                  value={reason}
                />
              </FormField>
            )}

            <FormField hint="Opcional" label="Observações">
              <TextArea
                maxLength={500}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Referência administrativa..."
                value={notes}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-1">
              <Button disabled={submitting} onClick={onClose} type="button" variant="secondary">
                Cancelar
              </Button>
              <Button loading={submitting} type="submit" variant="primary">
                Registrar nota
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
