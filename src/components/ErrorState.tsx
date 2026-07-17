import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

type ErrorStateProps = {
  action?: ReactNode;
  description: string;
  details?: string;
  title?: string;
};

// Estado de erro compartilhado (UI-07) — espelha EXATAMENTE o bloco de erro dos painéis
// financeiros: fundo/texto/ícone via tokens do DS (--danger-dim, --text, --text2, --danger)
// e a mesma borda vermelha de erro (rgba fixo, legível nos dois temas) que os painéis já
// usavam. Substitui as 6 cópias manuais. `action` (ex.: "Tentar novamente") fica à direita.
export function ErrorState({
  action,
  description,
  details,
  title = "Não foi possível carregar os dados"
}: ErrorStateProps) {
  return (
    <div
      className="flex flex-col gap-4 rounded-[var(--r)] border border-[rgba(239,68,68,0.28)] bg-[var(--danger-dim)] p-4 sm:flex-row sm:items-start sm:justify-between"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--danger)]" size={16} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text2)]">{description}</p>
          {details && (
            <p className="mt-2 break-words rounded-[var(--r)] border border-[rgba(239,68,68,0.28)] bg-[var(--surf2)] px-3 py-2 text-[11px] leading-5 text-[var(--text2)]">
              {details}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
