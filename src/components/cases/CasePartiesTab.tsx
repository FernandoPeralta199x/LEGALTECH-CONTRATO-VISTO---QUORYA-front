"use client";

import { FileText, Mail, Pencil, Phone, Plus, Users } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/FormField";
import type { PartyFormErrors } from "@/lib/useCasePartiesEditor";
import { useModalA11y } from "@/lib/useModalA11y";
import type { CaseParty, CasePartyCreate } from "@/types";

const partyTypeOptions = [
  { label: "Cliente", value: "cliente" },
  { label: "Contraparte", value: "contraparte" },
  { label: "Testemunha", value: "testemunha" },
  { label: "Responsável", value: "responsavel" },
  { label: "Outro", value: "outro" }
];

const partyTypeLabel: Record<string, string> = {
  avalista: "Avalista",
  cliente: "Cliente",
  contraparte: "Contraparte",
  contratada: "Contratada",
  contratante: "Contratante",
  fiador: "Fiador",
  outro: "Outro",
  responsavel: "Responsável",
  testemunha: "Testemunha"
};

type CasePartiesTabProps = {
  caseParties: CaseParty[];
  showPartyForm: boolean;
  editingParty: CaseParty | null;
  partyForm: CasePartyCreate;
  partyFormErrors: PartyFormErrors;
  partySubmitting: boolean;
  startCreateParty: () => void;
  startEditParty: (party: CaseParty) => void;
  updatePartyForm: <K extends keyof CasePartyCreate>(
    field: K,
    value: CasePartyCreate[K]
  ) => void;
  handlePartySubmit: (event: FormEvent<HTMLFormElement>) => void;
  resetPartyForm: () => void;
};

/**
 * Aba "Partes" do caso (lista + modal de criar/editar parte). PRESENTACIONAL,
 * extraída do god-file cases/[id]/page.tsx: o estado do editor (form, erros,
 * submit) vive no hook useCasePartiesEditor no pai e chega por props. Sem
 * mudança de comportamento.
 */
export function CasePartiesTab({
  caseParties,
  showPartyForm,
  editingParty,
  partyForm,
  partyFormErrors,
  partySubmitting,
  startCreateParty,
  startEditParty,
  updatePartyForm,
  handlePartySubmit,
  resetPartyForm
}: CasePartiesTabProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(showPartyForm, resetPartyForm);

  return (
    <div className="animate-in">
      <div className="mb-4 flex justify-end">
        <Button icon={<Plus aria-hidden="true" size={15} />} onClick={startCreateParty}>
          Adicionar parte
        </Button>
      </div>
      {caseParties.length === 0 ? (
        <EmptyState
          action={
            <Button icon={<Plus size={15} />} onClick={startCreateParty}>
              Adicionar parte
            </Button>
          }
          description="Cadastre as partes vinculadas a este caso."
          icon={<Users size={20} />}
          title="Nenhuma parte registrada"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {caseParties.map((party, index) => (
            <div
              className="animate-in"
              key={party.id}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--bd)] bg-[var(--surf2)] text-xs font-bold text-[var(--teal)]">
                    {party.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">
                      {party.name}
                    </p>
                    <span className="inline-flex rounded-md bg-[var(--surf3)] px-2 py-0.5 text-[11px] text-[var(--text2)]">
                      {partyTypeLabel[party.type] ?? party.type}
                    </span>
                  </div>
                </div>
                <Button
                  aria-label={`Editar parte ${party.name}`}
                  icon={<Pencil aria-hidden="true" size={14} />}
                  onClick={() => startEditParty(party)}
                  size="sm"
                  variant="secondary"
                >
                  Editar
                </Button>
              </div>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex min-w-0 items-center gap-2 text-[var(--text2)]">
                  <FileText size={12} className="shrink-0 text-[var(--text3)]" />
                  <span className="truncate">{party.document || "Documento não informado"}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2 text-[var(--text2)]">
                  <Mail size={12} className="shrink-0 text-[var(--text3)]" />
                  <span className="truncate">{party.email || "E-mail não informado"}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2 text-[var(--text2)]">
                  <Phone size={12} className="shrink-0 text-[var(--text3)]" />
                  <span className="truncate">{party.phone || "Telefone não informado"}</span>
                </div>
              </dl>
              {party.notes && (
                <p className="mt-3 border-t border-[var(--bd)] pt-3 text-xs leading-5 text-[var(--text2)]">
                  {party.notes}
                </p>
              )}
              </Card>
            </div>
          ))}
        </div>
      )}
      {showPartyForm && (
        <div
          aria-labelledby="party-form-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
          ref={dialogRef}
          role="dialog"
        >
          <form
            className="cv-card max-h-[calc(100vh-4rem)] w-full max-w-2xl overflow-y-auto p-5 shadow-2xl"
            onSubmit={handlePartySubmit}
          >
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-[var(--text)]" id="party-form-title">
                {editingParty ? "Editar parte" : "Adicionar parte"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
                Preencha os dados da parte vinculada a este caso.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField error={partyFormErrors.name} label="Nome da parte" required>
                <TextInput
                  invalid={Boolean(partyFormErrors.name)}
                  onChange={(event) => updatePartyForm("name", event.target.value)}
                  placeholder="Nome da parte"
                  value={partyForm.name}
                />
              </FormField>
              <FormField error={partyFormErrors.party_type} label="Papel" required>
                <SelectInput
                  invalid={Boolean(partyFormErrors.party_type)}
                  onChange={(event) => updatePartyForm("party_type", event.target.value)}
                  value={partyForm.party_type}
                >
                  {partyTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField
                error={partyFormErrors.document}
                hint="Opcional. CPF ou CNPJ."
                label="Documento"
              >
                <TextInput
                  invalid={Boolean(partyFormErrors.document)}
                  onChange={(event) => updatePartyForm("document", event.target.value)}
                  placeholder="00000000000"
                  value={partyForm.document ?? ""}
                />
              </FormField>
              <FormField error={partyFormErrors.email} label="E-mail">
                <TextInput
                  invalid={Boolean(partyFormErrors.email)}
                  onChange={(event) => updatePartyForm("email", event.target.value)}
                  placeholder="parte@example.test"
                  type="email"
                  value={partyForm.email ?? ""}
                />
              </FormField>
              <FormField label="Telefone">
                <TextInput
                  onChange={(event) => updatePartyForm("phone", event.target.value)}
                  placeholder="+5500000000000"
                  value={partyForm.phone ?? ""}
                />
              </FormField>
              <FormField label="Observações">
                <TextArea
                  onChange={(event) => updatePartyForm("notes", event.target.value)}
                  placeholder="Observações sobre a parte"
                  value={partyForm.notes ?? ""}
                />
              </FormField>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button disabled={partySubmitting} onClick={resetPartyForm} variant="secondary">
                Cancelar
              </Button>
              <Button loading={partySubmitting} type="submit">
                {editingParty ? "Salvar alterações" : "Adicionar parte"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
