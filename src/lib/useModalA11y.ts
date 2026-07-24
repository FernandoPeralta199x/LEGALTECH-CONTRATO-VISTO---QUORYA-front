import { useEffect, useRef } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Acessibilidade de modal reutilizável (extraída do ConfirmDialog): foco inicial
 * ao abrir + restauração do foco ao fechar, Escape fecha e trap de Tab dentro do
 * diálogo. Retorna a ref para anexar ao contêiner com `role="dialog"` — o
 * elemento que envolve todos os focáveis do modal.
 *
 * Padroniza o comportamento entre todos os modais (ConfirmDialog, "Editar caso",
 * "Adicionar/editar parte") em vez de reimplementar foco/ESC/trap em cada um
 * (A11Y-02/03).
 *
 * @param open   se o modal está aberto (os efeitos só agem quando `true`).
 * @param onClose chamado ao pressionar Escape (sempre a versão mais atual).
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void
) {
  const dialogRef = useRef<T>(null);

  // Foco inicial ao abrir + restauração ao fechar (roda só quando `open` muda,
  // para não roubar o foco a cada re-render do pai).
  useEffect(() => {
    if (!open) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => previouslyFocused?.focus?.();
  }, [open]);

  // Escape fecha + trap de Tab dentro do diálogo (onClose sempre atual via deps).
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const node = dialogRef.current;
      const items = node
        ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
        : [];
      if (items.length === 0) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return dialogRef;
}
