"use client";

import { useEffect, useRef, useState } from "react";

import type { PricingStatus } from "@/lib/usePricingEditor";

// Seções do editor — usadas pelos atalhos da barra fixa e pelo scroll-spy.
// "Observações" é ancorada (sec-observacoes) mas NÃO entra aqui de propósito: não
// tem atalho (removido a pedido). No fim da página o scroll-spy mantém a última
// seção (Parcelamento) acesa ao rolar por Observações — comportamento coerente.
export const PRICING_SECTIONS = [
  { id: "sec-limite", label: "Limite" },
  { id: "sec-modulos", label: "Módulos" },
  { id: "sec-parcelamento", label: "Parcelamento" },
] as const;

// Altura do header fixo do app (h-16 = 64px). A linha do scroll-spy e o alvo do
// goToSection somam a altura REAL da barra fixa (barRef) a esta base — fonte única.
const HEADER_OFFSET = 64;

/**
 * Barra fixa de atalhos do editor de Pricing: destaca a seção ativa (scroll-spy
 * determinístico) e rola até uma seção com offset dinâmico. Extraído de
 * admin/pricing/page.tsx sem mudar comportamento.
 */
export function usePricingScrollSpy(status: PricingStatus) {
  const [activeSection, setActiveSection] = useState<string>(PRICING_SECTIONS[0].id);
  const barRef = useRef<HTMLDivElement>(null);

  // Scroll-spy dos atalhos: a seção ativa é a última cujo topo já passou abaixo
  // da barra fixa (linha = header + barra + folga). Determinístico e estável —
  // evita o "piscar" do IntersectionObserver com seções altas. rAF faz o throttle.
  useEffect(() => {
    // Só pula enquanto CARREGA (as seções ainda não estão no DOM). Antes gatilhava
    // em !idle && !saving, o que REMOVIA o listener após um save com erro e
    // congelava o destaque — agora o scroll-spy segue ativo em 'error' e 'saving'.
    if (status === "loading") return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = HEADER_OFFSET + (barRef.current?.offsetHeight ?? 0) + 24;
      let current: string = PRICING_SECTIONS[0].id;
      for (const s of PRICING_SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      // Fim da página: a última seção pode ser curta demais para o topo cruzar a
      // linha — ao chegar ao fim, ativa a última mesmo assim. Só quando há rolagem
      // real (senão, com a página inteira visível, o topo já contaria como "fim").
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 4 && window.scrollY >= scrollable - 2) {
        current = PRICING_SECTIONS[PRICING_SECTIONS.length - 1].id;
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
  }, [status]);

  const goToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Offset dinâmico: header do app (HEADER_OFFSET) + altura real da barra fixa +
    // folga. Acompanha a barra crescer/quebrar (mobile) — não depende de scroll-mt.
    const barH = barRef.current?.offsetHeight ?? 0;
    const y =
      el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET - barH - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };

  return { activeSection, barRef, goToSection };
}
