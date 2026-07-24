import { Filter, Search } from "lucide-react";

import { statusFilterOptions } from "@/lib/caseFormOptions";

/** Barra de busca + filtro de status + contagem da lista de casos.
 *  Apresentacional — extraído de cases/page.tsx sem alterar a marcação. */
export function CasesFilterBar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  total,
  page,
  totalPages,
  loading
}: {
  query: string;
  onQueryChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm sm:w-80">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
            size={14}
          />
          <input
            className="cv-input w-full pl-9 pr-3 text-sm"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por código, cliente ou título..."
            type="search"
            value={query}
          />
        </div>
        <div className="relative w-full sm:w-auto">
          <Filter
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
            size={13}
          />
          <select
            aria-label="Filtrar casos por status"
            className="cv-input w-full pl-9 pr-3 text-xs font-medium [&_option]:bg-[var(--surf)]"
            onChange={(event) => onFilterChange(event.target.value)}
            value={filter}
          >
            <option value="">Todos os status</option>
            {statusFilterOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!loading && (
        <p className="text-xs text-[var(--text2)]">
          <span className="font-mono">{total}</span> caso{total !== 1 ? "s" : ""} no total
          {totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}
        </p>
      )}
    </div>
  );
}
