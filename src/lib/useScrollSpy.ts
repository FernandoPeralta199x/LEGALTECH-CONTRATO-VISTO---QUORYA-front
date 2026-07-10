"use client";

import { useEffect, useRef, useState } from "react";

export type ScrollSpySection = { id: string; label: string };

/** Scroll-spy determinístico dos atalhos: a seção ativa é a última cujo topo já passou
 *  abaixo da linha (headerOffset + altura da barra fixa + folga); ao chegar ao fim da
 *  página, força a última seção. rAF faz o throttle. Extraído de admin/pricing (fe-struct-02).
 *
 *  `enabled` substitui o gate original (só corria fora de "loading", quando as seções já
 *  estão no DOM). `recomputeToken` preserva o re-run de update() a cada mudança de `status`
 *  passada pela página (equivale ao dep [status] original; coincide com o layout shift do
 *  save), sem acoplar este hook ao enum de status. Dono do barRef (fonte única de altura da
 *  barra, reusada por goToSection e pela barra fixa). */
export function useScrollSpy(options: {
  sections: readonly ScrollSpySection[];
  headerOffset: number;
  enabled: boolean;
  recomputeToken?: unknown;
}) {
  const { sections, headerOffset, enabled, recomputeToken } = options;
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = headerOffset + (barRef.current?.offsetHeight ?? 0) + 24;
      let current: string = sections[0].id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      // Fim da página: a última seção pode ser curta demais para o topo cruzar a linha —
      // ao chegar ao fim, ativa a última mesmo assim. Só quando há rolagem real.
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 4 && window.scrollY >= scrollable - 2) {
        current = sections[sections.length - 1].id;
      }
      setActiveSection(current);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update(); // estado correto no mount/re-anexo, sem depender de um evento de scroll
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled, recomputeToken, sections, headerOffset]);

  const goToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Offset dinâmico: headerOffset + altura real da barra fixa + folga (fonte única com a
    // linha do scroll-spy) — acompanha a barra crescer/quebrar (mobile), sem scroll-mt.
    const barH = barRef.current?.offsetHeight ?? 0;
    const y =
      el.getBoundingClientRect().top + window.scrollY - headerOffset - barH - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };

  return { activeSection, barRef, goToSection };
}
