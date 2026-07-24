import { X } from "lucide-react";
import type { Ref } from "react";

import { Button } from "@/components/Button";
import { FormField, SelectInput } from "@/components/FormField";
import { caseDisplayTitle } from "@/lib/formatters";
import type { Case, CaseStatus, Priority } from "@/types";

/** Modal "Editar caso" (prioridade + status). Apresentacional — extraído de
 *  cases/page.tsx; foco/ESC/trap (A11Y-02) vêm do ref do useModalA11y na página. */
export function CaseEditModal({
  editing,
  editPriority,
  onPriorityChange,
  editStatus,
  onStatusChange,
  editStatusOptions,
  editSaving,
  dialogRef,
  onClose,
  onSave
}: {
  editing: Case;
  editPriority: Priority;
  onPriorityChange: (value: Priority) => void;
  editStatus: CaseStatus;
  onStatusChange: (value: CaseStatus) => void;
  editStatusOptions: { id: CaseStatus; label: string }[];
  editSaving: boolean;
  dialogRef: Ref<HTMLDivElement>;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      aria-labelledby="edit-case-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      ref={dialogRef}
      role="dialog"
    >
      <div className="cv-card w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-[var(--text)]" id="edit-case-title">
              Editar caso
            </h2>
            <p className="mt-1 text-xs text-[var(--text2)]">
              <span className="font-mono">{editing.code}</span> · {caseDisplayTitle(editing)}
            </p>
          </div>
          <button aria-label="Fechar" className="cv-icon-btn" onClick={onClose} type="button">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <FormField label="Prioridade">
            <SelectInput
              onChange={(e) => onPriorityChange(e.target.value as Priority)}
              value={editPriority}
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
              value={editStatus}
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
          <Button disabled={editSaving} onClick={onClose} variant="secondary">
            Cancelar
          </Button>
          <Button loading={editSaving} onClick={onSave}>
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}
