"use client";

import { X } from "lucide-react";

import { Button } from "@/components/Button";
import { FormField, SelectInput } from "@/components/FormField";
import { statusFilterOptions } from "@/lib/caseFormOptions";
import { caseDisplayTitle } from "@/lib/formatters";
import type { Case, CaseStatus, Priority } from "@/types";

type CaseEditModalProps = {
  editing: Case;
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
  status: CaseStatus;
  onStatusChange: (status: CaseStatus) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
};

/** Modal de edição do caso (prioridade + status). Presentacional; a mutação updateCase e a
 *  regra fe-be-dto-01 (só envia status quando muda) permanecem no handleEditSave da página.
 *  As opções do <select> de status incluem o status de sistema atual (ex.: triage_completed)
 *  no topo quando ele está fora das 6 transições válidas — mesma lógica do original. */
export function CaseEditModal({
  editing,
  priority,
  onPriorityChange,
  status,
  onStatusChange,
  saving,
  onClose,
  onSave
}: CaseEditModalProps) {
  const editStatusOptions = statusFilterOptions.some((o) => o.id === editing.status)
    ? statusFilterOptions
    : [
        { id: editing.status as CaseStatus, label: `Status atual (${editing.status})` },
        ...statusFilterOptions
      ];

  return (
    <div
      aria-labelledby="edit-case-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
    >
      <div className="cv-card w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2
              className="text-base font-bold text-[var(--text)]"
              id="edit-case-title"
            >
              Editar caso
            </h2>
            <p className="mt-1 text-xs text-[var(--text2)]">
              <span className="font-mono">{editing.code}</span> · {caseDisplayTitle(editing)}
            </p>
          </div>
          <button
            aria-label="Fechar"
            className="cv-icon-btn"
            onClick={onClose}
            type="button"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <FormField label="Prioridade">
            <SelectInput
              onChange={(e) => onPriorityChange(e.target.value as Priority)}
              value={priority}
            >
              <option value="low">Baixa</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </SelectInput>
          </FormField>

          <FormField label="Status">
            <SelectInput
              onChange={(e) => onStatusChange(e.target.value as CaseStatus)}
              value={status}
            >
              {editStatusOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </FormField>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            disabled={saving}
            onClick={onClose}
            variant="secondary"
          >
            Cancelar
          </Button>
          <Button loading={saving} onClick={onSave}>
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}
