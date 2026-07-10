"use client";

import { useEffect, useRef } from "react";

/** Dispara `window.print()` quando `active` fica truthy e chama `onDone` no evento
 *  `afterprint` (para limpar o estado da folha). Extraído dos 2 efeitos idênticos de
 *  impressão da tela de detalhe do caso (fe-struct-02). `onDone` é guardado em ref
 *  estável — o efeito depende SÓ de `active` (mesmo comportamento dos originais). */
export function usePrintOnChange(active: unknown, onDone: () => void): void {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const done = () => onDoneRef.current();
    window.addEventListener("afterprint", done);
    window.print();
    return () => window.removeEventListener("afterprint", done);
  }, [active]);
}
