import type { FormEvent } from "react";

import { Button } from "@/components/Button";
import { FormField, SelectInput, TextArea, TextInput } from "@/components/FormField";
import { contractTypes, productOptions, type CaseForm } from "@/lib/caseFormOptions";
import type { ValidationErrors } from "@/lib/validation";
import type { Client, Priority, ProductType } from "@/types";

/** Formulário de "caso rápido local" (criação inline na lista de casos).
 *  Apresentacional — extraído de cases/page.tsx sem alterar a marcação. */
export function CaseQuickCreateForm({
  form,
  formErrors,
  clients,
  submitting,
  onFieldChange,
  onSubmit,
  onCancel
}: {
  form: CaseForm;
  formErrors: ValidationErrors;
  clients: Client[];
  submitting: boolean;
  onFieldChange: <K extends keyof CaseForm>(field: K, value: CaseForm[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form className="cv-form-card mb-6 p-4 sm:p-5" onSubmit={onSubmit}>
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-[var(--text)]">Caso rápido local</h2>
        <p className="text-xs leading-5 text-[var(--text2)]">
          Ação operacional direta para o MVP local. O fluxo principal continua
          sendo Novo Pedido.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <FormField error={formErrors.title} label="Título do caso" required>
            <TextInput
              invalid={Boolean(formErrors.title)}
              onChange={(event) => onFieldChange("title", event.target.value)}
              placeholder="Análise contratual local"
              value={form.title}
            />
          </FormField>
        </div>
        <FormField error={formErrors.clientId} label="Cliente vinculado" required>
          <SelectInput
            disabled={clients.length === 0}
            invalid={Boolean(formErrors.clientId)}
            onChange={(event) => onFieldChange("clientId", event.target.value)}
            value={form.clientId}
          >
            {clients.length === 0 ? (
              <option value="">Nenhum cliente disponível</option>
            ) : (
              clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.casesCount > 0
                    ? ` · ${client.casesCount} caso${client.casesCount !== 1 ? "s" : ""}`
                    : ""}
                </option>
              ))
            )}
          </SelectInput>
        </FormField>
        <FormField error={formErrors.caseType} label="Tipo de caso" required>
          <SelectInput
            invalid={Boolean(formErrors.caseType)}
            onChange={(event) => onFieldChange("caseType", event.target.value)}
            value={form.caseType}
          >
            {contractTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label="Produto">
          <SelectInput
            onChange={(event) => onFieldChange("product", event.target.value as ProductType)}
            value={form.product}
          >
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.label}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField error={formErrors.priority} label="Prioridade" required>
          <SelectInput
            invalid={Boolean(formErrors.priority)}
            onChange={(event) => onFieldChange("priority", event.target.value as Priority)}
            value={form.priority}
          >
            <option value="low">Baixa</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </SelectInput>
        </FormField>
        <div className="md:col-span-2">
          <FormField label="Observações">
            <TextArea
              onChange={(event) => onFieldChange("notes", event.target.value)}
              placeholder="Observação demonstrativa local"
              value={form.notes}
            />
          </FormField>
        </div>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button disabled={submitting} onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button loading={submitting} type="submit">
          Criar caso
        </Button>
      </div>
    </form>
  );
}
