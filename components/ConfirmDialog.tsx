"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/Button";

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  variant?: "danger" | "primary";
};

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmDialog({
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  description,
  loading = false,
  onCancel,
  onConfirm,
  open,
  title,
  variant = "primary"
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Foco inicial no abrir + restauração ao fechar (roda só quando `open` muda,
  // para não roubar o foco a cada re-render do pai).
  useEffect(() => {
    if (!open) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => previouslyFocused?.focus?.();
  }, [open]);

  // Escape fecha + trap de Tab dentro do diálogo (onCancel sempre atual via deps).
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const node = dialogRef.current;
      const items = node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
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
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby="confirm-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
      ref={dialogRef}
      role="dialog"
    >
      <section className="cv-card w-full max-w-md p-5 shadow-2xl">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[rgba(249,115,22,0.24)] bg-[var(--orange-dim)] text-[var(--orange)]">
            <AlertTriangle aria-hidden="true" size={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]" id="confirm-dialog-title">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text2)]">{description}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={loading} onClick={onCancel} variant="secondary">
            {cancelLabel}
          </Button>
          <Button loading={loading} onClick={onConfirm} variant={variant === "danger" ? "danger" : "primary"}>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
