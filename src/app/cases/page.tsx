"use client";

import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CaseCard } from "@/components/cases/CaseCard";
import { CaseEditModal } from "@/components/cases/CaseEditModal";
import { CaseQuickCreateForm } from "@/components/cases/CaseQuickCreateForm";
import { CasesFilterBar } from "@/components/cases/CasesFilterBar";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Notification } from "@/components/Notification";
import { PageTitle } from "@/components/PageTitle";
import { caseDisplayTitle } from "@/lib/formatters";
import { useCaseMutations } from "@/lib/useCaseMutations";
import { useCasesList } from "@/lib/useCasesList";

export default function CasesPage() {
  // lista/busca/paginação no hook useCasesList (fe-struct-02)
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
  } = useCasesList();

  // form de criação rápida + edição + exclusão no hook useCaseMutations
  const {
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
  } = useCaseMutations({
    clients,
    setCases,
    setTotal,
    setError,
    setFallbackReason,
    setSuccessMessage
  });

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
          description="Acompanhe seus casos, abra os detalhes para analisar e editar, ou crie um novo pedido."
          eyebrow="Casos"
          title="Operação de casos"
        />

        {fallbackReason && (
          <Notification title="Sem conexão com o servidor" tone="warning">
            Não foi possível conectar ao servidor. A lista pode estar desatualizada.
          </Notification>
        )}
        {successMessage && (
          <Notification onDismiss={() => setSuccessMessage("")} title="Ação registrada" tone="success">
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
          onFilterChange={(value) => {
            setFilter(value);
            setPage(1); // reseta a página no mesmo update => 1 único fetch
          }}
          onQueryChange={setQuery}
          page={page}
          query={query}
          total={total}
          totalPages={totalPages}
        />

        {loading ? (
          <LoadingState
            description="Carregando clientes e casos."
            label="Carregando casos"
          />
        ) : error && cases.length === 0 ? (
          <ErrorState
            action={
              <Button icon={<RefreshCw size={15} />} onClick={() => void refreshCases()} variant="secondary">
                Tentar novamente
              </Button>
            }
            description="Não foi possível carregar os casos. Se o erro persistir, faça login novamente com uma conta autorizada."
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
                ? "Nenhum caso corresponde à busca atual. Limpe os filtros ou crie um novo pedido."
                : clients.length === 0
                  ? "Use Novo Pedido para o fluxo completo. O caso rápido exige um cliente já cadastrado."
                  : "Use Novo Pedido para o fluxo completo ou crie um caso rápido."
            }
            icon={<BriefcaseBusiness size={20} />}
            title={query || filter ? "Nenhum caso corresponde aos filtros" : "Nenhum caso ainda"}
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
            dialogRef={editDialogRef}
            editPriority={editPriority}
            editSaving={editSaving}
            editStatus={editStatus}
            editStatusOptions={editStatusOptions}
            editing={editing}
            onClose={closeEdit}
            onPriorityChange={setEditPriority}
            onSave={() => void handleEditSave()}
            onStatusChange={setEditStatus}
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
