import type { ReactNode } from "react";

import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";

export type ColumnAlign = "left" | "right";

export type Column<Row> = {
  key: string;
  label: string;
  align?: ColumnAlign;
  /** Renderiza a célula. Sem render, usa row[key] como texto. */
  render?: (row: Row) => ReactNode;
  className?: string;
};

export type TableState = "ready" | "loading" | "empty" | "error";

type FinancialTableProps<Row> = {
  columns: Column<Row>[];
  rows: Row[];
  /** Chave única por linha. */
  rowKey: (row: Row, index: number) => string;
  state?: TableState;
  density?: "comfortable" | "compact";
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  errorMessage?: string;
  onRetry?: () => void;
  /** Nº de linhas skeleton no estado loading. */
  loadingRows?: number;
};

const alignClass = (align?: ColumnAlign) =>
  align === "right" ? "text-right" : "text-left";

/** Tabela financeira reutilizável, semântica (<table>), com rolagem horizontal
 *  isolada. O cabeçalho (colunas) é sempre visível — mesmo vazio, a estrutura é
 *  real. Estados loading/empty/error são integrados, sem colapsar o layout nem
 *  inventar dados. */
export function FinancialTable<Row>({
  columns,
  rows,
  rowKey,
  state = "ready",
  density = "comfortable",
  toolbar,
  footer,
  emptyIcon,
  emptyTitle = "Sem dados no período",
  emptyDescription,
  errorMessage = "Não foi possível carregar os dados.",
  onRetry,
  loadingRows = 5
}: FinancialTableProps<Row>) {
  const cellPad = density === "compact" ? "py-2 px-3" : "py-3 px-3";
  const colCount = columns.length;

  return (
    <section className="cv-card overflow-hidden">
      {toolbar && (
        <div className="border-b border-[var(--bd)] p-4">{toolbar}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surf2)]">
              {columns.map((col) => (
                <th
                  className={cn(
                    "whitespace-nowrap border-b border-[var(--bd)] px-3 py-2.5 text-[10px] font-semibold uppercase text-[var(--text3)]",
                    alignClass(col.align)
                  )}
                  key={col.key}
                  scope="col"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {state === "loading" &&
              Array.from({ length: loadingRows }).map((_, rowIndex) => (
                <tr className="border-b border-[var(--bd)]" key={`sk-${rowIndex}`}>
                  {columns.map((col) => (
                    <td className={cellPad} key={col.key}>
                      <div
                        className={cn(
                          "skeleton h-3",
                          col.align === "right" ? "ml-auto w-16" : "w-24"
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))}

            {state === "empty" && (
              <tr>
                <td className="px-3 py-12" colSpan={colCount}>
                  <div className="flex flex-col items-center justify-center text-center">
                    {emptyIcon && (
                      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--bd)] bg-[var(--surf)] text-[var(--teal)]">
                        {emptyIcon}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {emptyTitle}
                    </p>
                    {emptyDescription && (
                      <p className="mt-2 max-w-md text-xs leading-5 text-[var(--text2)]">
                        {emptyDescription}
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {state === "error" && (
              <tr>
                <td className="px-3 py-12" colSpan={colCount}>
                  <div className="flex flex-col items-center justify-center text-center">
                    <p className="text-sm font-semibold text-[var(--danger)]">
                      Erro ao carregar
                    </p>
                    <p className="mt-2 max-w-md text-xs leading-5 text-[var(--text2)]">
                      {errorMessage}
                    </p>
                    {onRetry && (
                      <Button
                        className="mt-4"
                        onClick={onRetry}
                        size="sm"
                        variant="secondary"
                      >
                        Tentar novamente
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {state === "ready" &&
              rows.map((row, rowIndex) => (
                <tr
                  className="border-b border-[var(--bd)] transition-colors last:border-0 hover:bg-[var(--surf3)]"
                  key={rowKey(row, rowIndex)}
                >
                  {columns.map((col) => (
                    <td
                      className={cn(cellPad, "align-middle", alignClass(col.align), col.className)}
                      key={col.key}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className="border-t border-[var(--bd)] p-4">{footer}</div>
      )}
    </section>
  );
}
