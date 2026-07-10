"use client";

import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw
} from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Notification } from "@/components/Notification";
import { PageTitle } from "@/components/PageTitle";
import { CaseCard } from "@/components/cases/CaseCard";
import { CaseEditModal } from "@/components/cases/CaseEditModal";
import { CaseQuickCreateForm } from "@/components/cases/CaseQuickCreateForm";
import { CasesFilterBar } from "@/components/cases/CasesFilterBar";
import { caseDisplayTitle } from "@/lib/formatters";
import { errorMessage } from "@/lib/errorMessage";
import { createCase, deleteCase, updateCase } from "@/services/cases";
import { useCasesList } from "@/lib/useCasesList";
import { validateCaseForm, type ValidationErrors } from "@/lib/validation";
import type { Case, CaseCreate, CaseStatus, CaseUpdate, Priority } from "@/types";
import { emptyCaseForm, type CaseForm } from "@/lib/caseFormOptions";

export default function CasesPage() {
  // form + modal (page-owned); lista/busca/paginação no hook useCasesList (fe-struct-02)
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

  const {
    cases,
    setCases,
    clients,
    error,
    setError,
    fallbackReason,
    setFallbackReason,
    filter,
    setFilter,
    loading,
    query,
    setQuery,
    page,
    setPage,
    total,
    setTotal,
    totalPages,
    successMessage,
    setSuccessMessage,
    refreshCases,
    clearListFilters
  } = useCasesList({
    onClientsLoaded: (loadedClients) =>
      setForm((current) => ({
        ...current,
        clientId: current.clientId || loadedClients[0]?.id || ""
      }))
  });

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

  return (
    <AuthGuard>
      <AppLayout>
        <PageTitle
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                href="/cases/new"
                icon={<Plus aria-hidden="true" size={15} />}
              >
                Novo Pedido
              </Button>
              <Button
                icon={<RefreshCw aria-hidden="true" size={15} />}
                loading={loading}
                onClick={() => void refreshCases()}
                variant="secondary"
              >
                Atualizar
              </Button>
              <Button
                icon={<Plus aria-hidden="true" size={15} />}
                onClick={() => {
                  setShowForm((current) => !current);
                  setError("");
                  setSuccessMessage("");
                }}
                variant="secondary"
              >
                Criar caso rápido
              </Button>
            </div>
          }
          description="Acompanhe registros existentes, abra detalhes para analisar e editar, e use Novo Pedido como fluxo principal de entrada do MVP local."
          eyebrow="Casos"
          title="Operação de casos"
        />

        {fallbackReason && (
          <Notification title="Fallback local ativo" tone="warning">
            A API local não respondeu. A lista usa dados demonstrativos e não substitui validação com PostgreSQL local.
          </Notification>
        )}
        {successMessage && (
          <Notification onDismiss={() => setSuccessMessage("")} title="Ação local registrada" tone="success">
            {successMessage}
          </Notification>
        )}
        {error && !loading && (
          <Notification onDismiss={() => setError("")} title="Atenção" tone="error">
            {error}
          </Notification>
        )}

        {showForm && (
          <CaseQuickCreateForm
            clients={clients}
            form={form}
            formErrors={formErrors}
            onCancel={() => setShowForm(false)}
            onFieldChange={updateForm}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}

        <CasesFilterBar
          filter={filter}
          loading={loading}
          onQueryChange={setQuery}
          onStatusChange={(value) => {
            setFilter(value);
            setPage(1); // reseta a página no mesmo update => 1 único fetch
          }}
          page={page}
          query={query}
          total={total}
          totalPages={totalPages}
        />

        {loading ? (
          <LoadingState
            description="Carregando clientes e casos da API local ou fallback local."
            label="Carregando casos"
          />
        ) : error && cases.length === 0 ? (
          <ErrorState
            action={
              <Button icon={<RefreshCw size={15} />} onClick={() => void refreshCases()} variant="secondary">
                Tentar novamente
              </Button>
            }
            description="A listagem de casos não pôde ser carregada pela API local. Se for 401/403, faça login novamente com uma conta autorizada."
            details={error}
          />
        ) : cases.length === 0 ? (
          <EmptyState
            action={
              query || filter ? (
                <Button icon={<Filter size={15} />} onClick={clearListFilters} variant="secondary">
                  Limpar filtros
                </Button>
              ) : (
                <Button href="/cases/new" icon={<Plus size={15} />}>
                  Novo Pedido
                </Button>
              )
            }
            secondaryAction={
              query || filter ? (
                <Button href="/cases/new" icon={<Plus size={15} />}>
                  Novo Pedido
                </Button>
              ) : (
                <Button onClick={() => setShowForm(true)} variant="secondary">
                  Criar caso rápido
                </Button>
              )
            }
            description={
              query || filter
                ? "Nenhum registro existente corresponde à busca atual. Limpe os filtros ou inicie uma nova simulação em Novo Pedido."
                : clients.length === 0
                  ? "Use Novo Pedido para simular o fluxo principal. O caso rápido exige um cliente já disponível no MVP local."
                  : "Use Novo Pedido para compor uma simulação frontend-first ou crie um caso rápido para validação operacional local."
            }
            icon={<BriefcaseBusiness size={20} />}
            title={query || filter ? "Nenhum caso corresponde aos filtros" : "Nenhum registro operacional ainda"}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {cases.map((c, index) => (
              <CaseCard
                deletingId={deletingId}
                index={index}
                key={c.id}
                legalCase={c}
                onDelete={handleDelete}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}

        {!loading && cases.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4 text-sm text-[var(--text2)]">
            <Button
              disabled={page <= 1}
              icon={<ChevronLeft size={15} />}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              variant="secondary"
            >
              Anterior
            </Button>
            <span>
              Página {page} de {totalPages}
            </span>
            <Button
              disabled={page >= totalPages}
              iconRight={<ChevronRight size={15} />}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              variant="secondary"
            >
              Próxima
            </Button>
          </div>
        )}

        {editing && (
          <CaseEditModal
            editing={editing}
            onClose={closeEdit}
            onPriorityChange={setEditPriority}
            onSave={() => void handleEditSave()}
            onStatusChange={setEditStatus}
            priority={editPriority}
            saving={editSaving}
            status={editStatus}
          />
        )}
        <ConfirmDialog
          cancelLabel="Cancelar"
          confirmLabel="Excluir caso"
          description={
            deleteCandidate
              ? `Excluir o caso "${caseDisplayTitle(deleteCandidate)}" (${deleteCandidate.code})? A ação faz soft-delete: o caso some da listagem, mas pode ser recuperado pelo admin do banco.`
              : ""
          }
          loading={Boolean(deletingId)}
          onCancel={cancelDelete}
          onConfirm={() => void confirmDelete()}
          open={Boolean(deleteCandidate)}
          title="Confirmar exclusão"
          variant="danger"
        />
      </AppLayout>
    </AuthGuard>
  );
}
