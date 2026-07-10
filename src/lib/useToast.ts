"use client";

import { useEffect, useState } from "react";

const DEFAULT_TOAST_MS = 4000;

export type ToastMessage = { text: string; type: "success" | "error" };

/** Toast simples com auto-dismiss. Extraído de admin/pricing (fe-struct-02) para ser
 *  reutilizável por outras telas. */
export function useToast(durationMs: number = DEFAULT_TOAST_MS) {
  const [message, setMessage] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), durationMs);
    return () => clearTimeout(t);
  }, [message, durationMs]);

  return { message, setMessage };
}
