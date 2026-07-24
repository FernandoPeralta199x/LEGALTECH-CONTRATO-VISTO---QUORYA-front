import {
  ArrowRight,
  BriefcaseBusiness,
  Calendar,
  FileText,
  Pencil,
  Shield,
  Trash2,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";

import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { caseDisplayTitle, formatDate } from "@/lib/formatters";
import { productLabel, reportStatusLabel, sourceModeLabel } from "@/lib/reportLabels";
import type { Case } from "@/types";

/** Cartão de um caso na grade da lista (link para o detalhe + ações editar/excluir).
 *  Apresentacional — extraído de cases/page.tsx sem alterar a marcação. */
export function CaseCard({
  legalCase: c,
  index,
  deletingId,
  onEdit,
  onDelete
}: {
  legalCase: Case;
  index: number;
  deletingId: string | null;
  onEdit: (legalCase: Case, event: MouseEvent) => void;
  onDelete: (legalCase: Case, event: MouseEvent) => void;
}) {
  return (
    <Link
      className="cv-card cv-card-hover group block p-5 animate-in pressable"
      href={`/cases/${c.id}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--bd)] bg-[var(--surf2)] transition group-hover:border-[rgba(32,201,151,0.25)] group-hover:bg-[var(--teal-dim)]">
          <BriefcaseBusiness
            className="text-[var(--text2)] transition group-hover:text-[var(--teal)]"
            size={18}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            aria-label="Editar caso"
            className="cv-icon-btn"
            onClick={(e) => onEdit(c, e)}
            type="button"
          >
            <Pencil size={13} />
          </button>
          <button
            aria-label="Excluir caso"
            className="cv-icon-btn cv-icon-btn--danger"
            disabled={deletingId === c.id}
            onClick={(e) => onDelete(c, e)}
            type="button"
          >
            <Trash2 size={13} />
          </button>
          <StatusBadge status={c.status} />
        </div>
      </div>

      <p className="mt-4 text-[11px] font-mono font-semibold text-brand-teal">
        {c.code}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-normal text-[var(--text3)]">
        Origem: {sourceModeLabel(c.sourceMode ?? c.metadata?.sourceMode)}
      </p>
      <h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[var(--text)]">
        {caseDisplayTitle(c)}
      </h2>
      <p className="mt-1 text-[11px] text-[var(--text3)]">
        {c.productLabel ?? productLabel(c.caseType)}
      </p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] text-[var(--text3)]">Progresso</span>
          <span className="text-[10px] font-mono font-semibold text-[var(--text2)]">
            {c.progressPercent}%
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[var(--surf3)]">
          <div
            className={`h-1 rounded-full transition-all ${
              c.progressPercent === 100
                ? "bg-teal-500"
                : c.progressPercent > 60
                  ? "bg-brand-teal"
                  : "bg-violet-500"
            }`}
            style={{ width: `${c.progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-2 text-[var(--text2)]">
          <UsersRound className="shrink-0 text-[var(--text3)]" size={12} />
          <span className="truncate">Cliente: {c.clientName}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-[var(--text2)]">
          <FileText className="shrink-0 text-[var(--text3)]" size={12} />
          <span className="truncate">
            {c.documentsCount === 0
              ? "Sem documentos"
              : `Documentos: ${c.documentsCount}`}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-[var(--text2)]">
          <Shield className="shrink-0 text-[var(--text3)]" size={12} />
          <span className="truncate">Relatório: {reportStatusLabel(c.metadata?.reportStatus)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--bd)] pt-3 text-[11px] text-[var(--text3)]">
        <span className="flex min-w-0 items-center gap-1.5">
          <Calendar className="shrink-0" size={11} />
          <span className="truncate">Atualizado em <span className="font-mono">{formatDate(c.updatedAt)}</span></span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <PriorityBadge priority={c.priority} />
          <ArrowRight className="text-[var(--text3)] transition group-hover:text-[var(--teal)]" size={13} />
        </span>
      </div>
    </Link>
  );
}
