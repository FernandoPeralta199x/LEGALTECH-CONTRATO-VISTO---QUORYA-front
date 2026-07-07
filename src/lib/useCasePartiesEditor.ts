"use client";

/**
 * Editor de partes do caso — hook extraído do god-file cases/[id]/page.tsx.
 * Concentra o estado do formulário (criar/editar parte), a validação e o
 * submit (create/update via services/caseParties). A página continua dona da
 * lista de partes/agregado: o hook devolve o resultado via `applyParties`.
 */
import { useState, type FormEvent } from "react";

import { errorMessage } from "@/src/lib/errorMessage";
import { isValidEmail } from "@/src/lib/validation";
import { createCaseParty, updateCaseParty } from "@/src/services/caseParties";
import type {
  CaseAggregate,
  CaseParty,
  CasePartyCreate,
  CasePartyUpdate
} from "@/types";

export type PartyFormErrors = Partial<Record<keyof CasePartyCreate, string>>;

export const emptyPartyForm: CasePartyCreate = {
  document: "",
  email: "",
  name: "",
  notes: "",
  party_type: "cliente",
  phone: ""
};

export function validatePartyForm(form: CasePartyCreate): PartyFormErrors {
  const errors: PartyFormErrors = {};
  const document = form.document?.trim() ?? "";
  const email = form.email?.trim() ?? "";

  if (!form.name.trim()) {
    errors.name = "Informe o nome da parte.";
  }

  if (!form.party_type.trim()) {
    errors.party_type = "Selecione o papel da parte.";
  }

  if (document && !/^[A-Za-z0-9./-]+$/.test(document)) {
    errors.document = "Use apenas números, letras, pontos, barras ou hífens.";
  }

  if (email && !isValidEmail(email)) {
    errors.email = "Informe um e-mail válido ou deixe o campo vazio.";
  }

  return errors;
}

export function buildPartyPayload(form: CasePartyCreate): CasePartyCreate {
  return {
    document: form.document?.trim() || null,
    email: form.email?.trim() || null,
    name: form.name.trim(),
    notes: form.notes?.trim() || null,
    party_type: form.party_type,
    phone: form.phone?.trim() || null
  };
}

export function partyFormFromParty(party: CaseParty): CasePartyCreate {
  return {
    document: party.document ?? "",
    email: party.email ?? "",
    name: party.name,
    notes: party.notes ?? "",
    party_type: party.type,
    phone: party.phone ?? ""
  };
}

export function aggregatePartyFromCaseParty(
  party: CaseParty,
  fallbackOrganizationId: string
): CaseAggregate["parties"][number] {
  return {
    ...party,
    organizationId: party.organizationId ?? fallbackOrganizationId,
    role: typeof party.metadata?.role === "string" ? party.metadata.role : party.type
  };
}

type UseCasePartiesEditorOptions = {
  caseId: string;
  /** Aplica a lista atualizada de partes no estado da página (caso/agregado). */
  applyParties: (updater: (current: CaseParty[]) => CaseParty[]) => void;
  /** Propaga o fallbackReason quando o service respondeu do fallback local. */
  onFallbackReason: (reason: string) => void;
};

export function useCasePartiesEditor({
  caseId,
  applyParties,
  onFallbackReason
}: UseCasePartiesEditorOptions) {
  const [editingParty, setEditingParty] = useState<CaseParty | null>(null);
  const [partyError, setPartyError] = useState("");
  const [partyForm, setPartyForm] = useState<CasePartyCreate>(emptyPartyForm);
  const [partyFormErrors, setPartyFormErrors] = useState<PartyFormErrors>({});
  const [partySubmitting, setPartySubmitting] = useState(false);
  const [partySuccessMessage, setPartySuccessMessage] = useState("");
  const [showPartyForm, setShowPartyForm] = useState(false);

  function resetPartyForm() {
    setEditingParty(null);
    setPartyForm(emptyPartyForm);
    setPartyFormErrors({});
    setPartyError("");
    setShowPartyForm(false);
  }

  function startCreateParty() {
    setEditingParty(null);
    setPartyForm(emptyPartyForm);
    setPartyFormErrors({});
    setPartyError("");
    setPartySuccessMessage("");
    setShowPartyForm(true);
  }

  function startEditParty(party: CaseParty) {
    setEditingParty(party);
    setPartyForm(partyFormFromParty(party));
    setPartyFormErrors({});
    setPartyError("");
    setPartySuccessMessage("");
    setShowPartyForm(true);
  }

  function updatePartyForm<K extends keyof CasePartyCreate>(
    field: K,
    value: CasePartyCreate[K]
  ) {
    setPartyForm((current) => ({ ...current, [field]: value }));
    setPartyFormErrors((current) => ({ ...current, [field]: "" }));
    setPartyError("");
    setPartySuccessMessage("");
  }

  async function handlePartySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (partySubmitting) {
      return;
    }

    const validationErrors = validatePartyForm(partyForm);
    setPartyFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setPartyError("Revise os campos destacados antes de registrar a parte local.");
      return;
    }

    setPartySubmitting(true);
    setPartyError("");
    setPartySuccessMessage("");

    try {
      const payload = buildPartyPayload(partyForm);
      const result = editingParty
        ? await updateCaseParty(caseId, editingParty.id, payload as CasePartyUpdate)
        : await createCaseParty(caseId, payload);

      applyParties((current) =>
        editingParty
          ? current.map((party) =>
              party.id === result.data.id ? result.data : party
            )
          : [result.data, ...current]
      );
      onFallbackReason(result.source === "mock" ? result.fallbackReason ?? "" : "");
      setPartySuccessMessage(
        result.source === "mock"
          ? editingParty
            ? "Registro local de parte atualizado no fallback de desenvolvimento."
            : "Registro local de parte criado no fallback de desenvolvimento."
          : editingParty
            ? "Registro de parte atualizado pela API local."
            : "Registro de parte criado pela API local."
      );
      resetPartyForm();
    } catch (err) {
      setPartyError(errorMessage(err));
    } finally {
      setPartySubmitting(false);
    }
  }

  function dismissPartySuccess() {
    setPartySuccessMessage("");
  }

  function dismissPartyError() {
    setPartyError("");
  }

  return {
    editingParty,
    partyError,
    partyForm,
    partyFormErrors,
    partySubmitting,
    partySuccessMessage,
    showPartyForm,
    dismissPartyError,
    dismissPartySuccess,
    resetPartyForm,
    startCreateParty,
    startEditParty,
    updatePartyForm,
    handlePartySubmit
  };
}
