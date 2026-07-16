"use client";

import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

type FinancialTab<T extends string> = { id: T; label: string; icon: LucideIcon };

/** Faixa de abas do Financeiro (padrão ARIA Tabs). Em vez da scrollbar do
 *  navegador, esconde a barra e sinaliza o overflow com fade + setas — que só
 *  aparecem no lado que de fato tem abas cortadas. Mantém a aba ativa visível. */
export function FinancialTabs<T extends string>({
  tabs,
  activeTab,
  onChange
}: {
  tabs: FinancialTab<T>[];
  activeTab: T;
  onChange: (id: T) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= maxScroll - 1); // maxScroll<=0 (sem overflow) => atEnd=true
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    update();
    // Listener NATIVO no elemento: o `scroll` não borbulha e o onScroll delegado do
    // React não o captura de forma confiável aqui (nem em scroll programático).
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, [update]);

  // Ao trocar de aba (inclui teclado), traz a ativa para o campo de visão.
  useEffect(() => {
    document.getElementById(`tab-${activeTab}`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    update();
  }, [activeTab, update]);

  const nudge = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.7), behavior: "smooth" });
    // A rolagem suave nem sempre emite um `scroll` no ponto final; recomputa em
    // alguns instantes após a animação para as setas/fade refletirem o fim/começo.
    [100, 300, 550, 850].forEach((ms) => window.setTimeout(update, ms));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === activeTab);
    let nextIndex: number;
    if (event.key === "ArrowRight") nextIndex = (i + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    const next = tabs[nextIndex];
    onChange(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  const edgeBtn =
    "absolute bottom-1 top-1 z-10 flex w-7 items-center justify-center rounded-md text-[var(--text2)] transition hover:bg-[var(--surf2)] hover:text-[var(--text)]";

  return (
    <div className="relative mb-6">
      <div
        aria-label="Áreas do Financeiro"
        className="cv-hide-scrollbar flex overflow-x-auto border-b border-[var(--bd)]"
        onKeyDown={onKeyDown}
        ref={scrollRef}
        role="tablist"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              aria-controls={active ? `panel-${tab.id}` : undefined}
              aria-selected={active}
              className={
                active
                  ? "flex items-center gap-2 whitespace-nowrap border-b-2 border-[var(--teal)] px-4 py-2.5 text-[14px] font-semibold text-[var(--teal)] transition"
                  : "flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-[14px] font-medium text-[var(--text2)] transition hover:text-[var(--text)]"
              }
              id={`tab-${tab.id}`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              role="tab"
              tabIndex={active ? 0 : -1}
              type="button"
            >
              <Icon aria-hidden="true" size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {!atStart && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-px left-0 top-0 w-12 bg-gradient-to-r from-[var(--bg)] to-transparent"
          />
          <button aria-label="Rolar abas para a esquerda" className={`${edgeBtn} left-0`} onClick={() => nudge(-1)} type="button">
            <ChevronLeft size={16} />
          </button>
        </>
      )}

      {!atEnd && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-px right-0 top-0 w-12 bg-gradient-to-l from-[var(--bg)] to-transparent"
          />
          <button aria-label="Rolar abas para a direita" className={`${edgeBtn} right-0`} onClick={() => nudge(1)} type="button">
            <ChevronRight size={16} />
          </button>
        </>
      )}
    </div>
  );
}
