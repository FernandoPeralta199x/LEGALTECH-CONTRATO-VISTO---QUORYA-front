"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { errorMessage } from "@/lib/errorMessage";
import { createCase, deleteCase, updateCase } from "@/services/cases";
import { useModalA11y } from "@/lib/useModalA11y";
import { validateCaseForm, type ValidationErrors } from "@/lib/validation";
import { emptyCaseForm, statusFilterOptions, type CaseForm } from "@/lib/caseFormOptions";
import type {
  Case,
  CaseCreate,
  CaseStatus,
  CaseUpdate,
  Client,
  Priority
} from "@/types";

type Params = {
  clients: Client[];
  setCases: React.Dispatch<React.SetStateAction<Case[]>>;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
  setError: (message: string) => void;
  setFallbackReason: (reason: string) => void;
  setSuccessMessage: (message: string) => void;
};

/**
 * Mutações da lista de casos (criar rápido, editar prioridade/status, excluir) e
 * o estado que só existe por causa delas — extraído de cases/page.tsx sem mudar
 * comportamento. A lista/busca/paginação continuam em [[useCasesList]].
 *
 * A inicialização do `clientId` do formulário (antes via onClientsLoaded do
 * useCasesList) virou um efeito sobre `clients` aqui — comportamento equivalente
 * (só preenche quando vazio), sem o acoplamento circular entre os dois hooks.
 */
export function useCaseMutations({
  clients,
  setCases,
  setTotal,
  setError,
  setFallbackReason,
  setSuccessMessage
}: Params) {
  const [form, setForm] = useState<CaseForm>(emptyCaseForm);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Case | null>(null);
  const [editPriority, setEditPriority] = useState<Priority>("normal");
  const [editStatus, setEditStatus] = useState<CaseStatus>("draft");
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Case | null>(null);

  // Preenche o clientId com o primeiro cliente quando a lista carrega (só se vazio) —
  // substitui o antigo onClientsLoaded do useCasesList (que causaria acoplamento
  // circular entre os dois hooks). Sync unidirecional e idempotente (o guard
  // `current.clientId ||` só preenche quando vazio; jamais sobrescreve a escolha do usuário).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync de default derivado dos clientes carregados; idempotente, sem loop.
    setForm((current) => ({
      ...current,
      clientId: current.clientId || clients[0]?.id || ""
    }));
  }, [clients]);

  function openEdit(legalCase: Case, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setEditing(legalCase);
    setEditPriority(legalCase.priority);
    setEditStatus(legalCase.status);
    setError("");
    setSuccessMessage("");
  }

  function closeEdit() {
    setEditing(null);
    setEditSaving(false);
  }

  // Foco/ESC/trap do modal "Editar caso" (A11Y-02) — mesmo padrão do ConfirmDialog.
  const editDialogRef = useModalA11y<HTMLDivElement>(Boolean(editing), closeEdit);

  async function handleEditSave() {
    if (!editing || editSaving) return;
    setEditSaving(true);
    setError("");
    try {
      // Só envia 'status' quando o usuário o alterou de fato: reenviar o status
      // corrente (ex.: 'triage_completed', estado de sistema) causava 400 no backend
      // (fe-be-dto-01). Priority é sempre editável.
      const payload: CaseUpdate = { priority: editPriority };
      if (editStatus !== editing.status) {
        payload.status = editStatus;
      }
      const result = await updateCase(editing.id, payload, clients);
      setCases((current) =>
        current.map((c) => (c.id === editing.id ? result.data : c))
      );
      setSuccessMessage(
        result.source === "mock"
          ? "Caso atualizado no fallback local."
          : "Caso atualizado pela API."
      );
      closeEdit();
    } catch (err) {
      setError(errorMessage(err, "Não foi possível salvar a edição."));
    } finally {
      setEditSaving(false);
    }
  }

  // Opções do <select> de status na edição: as 6 transições válidas (CASE_STATUS_PATTERN).
  // Se o caso está num status de sistema fora do conjunto (ex.: triage_completed), inclui-o
  // no topo para o select exibir o valor REAL (antes mostrava a 1a opção, errada).
  const editStatusOptions =
    !editing || statusFilterOptions.some((o) => o.id === editing.status)
      ? statusFilterOptions
      : [
          { id: editing.status as CaseStatus, label: `Status atual (${editing.status})` },
          ...statusFilterOptions
        ];

  async function handleDelete(legalCase: Case, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (deletingId) return;
    setDeleteCandidate(legalCase);
  }

  async function confirmDelete() {
    const legalCase = deleteCandidate;
    if (!legalCase) return;
    setDeletingId(legalCase.id);
    setError("");
    try {
      const result = await deleteCase(legalCase.id);
      setCases((current) => current.filter((c) => c.id !== legalCase.id));
      setTotal((t) => Math.max(0, t - 1));
      setSuccessMessage(
        result.source === "mock"
          ? "Caso removido do fallback local."
          : "Caso excluído pela API."
      );
      setDeleteCandidate(null);
    } catch (err) {
      setError(errorMessage(err, "Não foi possível excluir o caso."));
    } finally {
      setDeletingId(null);
    }
  }

  function cancelDelete() {
    setDeleteCandidate(null);
  }

  function updateForm<K extends keyof CaseForm>(field: K, value: CaseForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: "" }));
    setError("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const validation = validateCaseForm(form);
    setFormErrors(validation.errors);
    if (!validation.valid) {
      setError("Revise os campos destacados antes de criar o caso.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload: CaseCreate = {
        case_type: form.caseType,
        client_id: form.clientId,
        metadata: {
          notes: form.notes.trim(),
          product: form.product,
          source: "frontend",
          title: form.title.trim()
        },
        priority: form.priority
      };
      const result = await createCase(payload, clients);
      setTotal((t) => t + 1);
      setCases((current) => [result.data, ...current]);
      setFallbackReason(result.source === "mock" ? result.fallbackReason ?? "" : "");
      setSuccessMessage(
        result.source === "mock"
          ? "Caso criado no fallback local de desenvolvimento."
          : "Caso criado pela API local."
      );
      setShowForm(false);
      setForm((current) => ({
        ...emptyCaseForm,
        clientId: current.clientId || clients[0]?.id || ""
      }));
      setFormErrors({});
    } catch (err) {
      setError(errorMessage(err, "Não foi possível carregar casos."));
    } finally {
      setSubmitting(false);
    }
  }

  return {
    form,
    formErrors,
    showForm,
    setShowForm,
    submitting,
    updateForm,
    handleSubmit,
    editing,
    editPriority,
    setEditPriority,
    editStatus,
    setEditStatus,
    editSaving,
    editStatusOptions,
    editDialogRef,
    openEdit,
    closeEdit,
    handleEditSave,
    deletingId,
    deleteCandidate,
    handleDelete,
    confirmDelete,
    cancelDelete
  };
}
