import { FileText } from "lucide-react";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/formatters";
import type { Document } from "@/types";

/** Aba Documentos do caso: lista os metadados de documento (ou estado vazio).
 *  Apresentacional — extraído de cases/[id]/page.tsx sem alterar a marcação. */
export function CaseDocumentsTab({ documents }: { documents: Document[] }) {
  return (
    <div className="animate-in space-y-3">
      {documents.length === 0 ? (
        <EmptyState
          action={
            <Button href="/documents" variant="secondary">
              Abrir documentos
            </Button>
          }
          description="Nenhum metadado de documento foi encontrado para este caso."
          icon={<FileText size={20} />}
          title="Sem documentos"
        />
      ) : (
        documents.map((doc, index) => (
          <div
            className="animate-in flex flex-col gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-5 py-4 sm:flex-row sm:items-center sm:gap-4"
            key={doc.id}
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surf3)]">
              <FileText className="text-[var(--text2)]" size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text)]">
                {doc.filename}
              </p>
              <p className="text-xs text-[var(--text3)]">
                {doc.sizeLabel} · {formatDate(doc.uploadedAt)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text3)]">
                OCR: {doc.ocrStatus ?? "not_started"} · IA: {doc.aiReadStatus ?? "not_started"}
              </p>
            </div>
            <div className="self-start sm:self-center">
              <StatusBadge status={doc.status} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
