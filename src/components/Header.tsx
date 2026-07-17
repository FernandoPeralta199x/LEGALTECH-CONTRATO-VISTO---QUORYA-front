"use client";

import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/cn";
import { clearStoredSession } from "@/lib/authStorage";
import { useDevSession } from "@/lib/useDevSession";
import { listCases } from "@/services/cases";
import { listClients } from "@/services/clients";
import type { Case, Client } from "@/types";
import { Briefcase, LogOut, Menu, Search, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type HeaderProps = { onMenuClick?: () => void };

const roleMeta: Record<string, { label: string; cls: string }> = {
  admin:   { label: "Administrador", cls: "cv-badge-blue" },
  analyst: { label: "Analista", cls: "cv-badge-teal" },
  client:  { label: "Cliente",  cls: "cv-badge-muted" },
  owner:   { label: "Proprietário", cls: "cv-badge-teal" },
  support: { label: "Suporte",  cls: "cv-badge-orange" }
};

export function Header({ onMenuClick }: HeaderProps) {
  const router        = useRouter();
  const session       = useDevSession();
  const [query, setQuery]           = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [cases, setCases]           = useState<Case[]>([]);
  const [clients, setClients]       = useState<Client[]>([]);
  const [loading, setLoading]       = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [searchError, setSearchError] = useState(false); // FE-08
  const [activeIndex, setActiveIndex] = useState(-1);     // FE-10 (combobox)
  const searchRef = useRef<HTMLDivElement>(null);

  // busca real (debounced) em casos + clientes; mín. 2 caracteres
  useEffect(() => {
    const term = query.trim();
    let cancelled = false;
    // setState fica dentro do setTimeout (deferido) para nao disparar cascade
    // render sincrono no corpo do efeito (react-hooks/set-state-in-effect)
    const t = setTimeout(async () => {
      if (term.length < 2) {
        if (cancelled) return;
        setCases([]);
        setClients([]);
        setResultsOpen(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      setSearchError(false);
      try {
        // FE-08: NÃO engole erro — uma falha vira estado de erro no dropdown, em vez
        // de "Nenhum resultado" (que escondia backend fora/500 do usuário).
        const [c, cl] = await Promise.all([
          listCases({ q: term, pageSize: 6 }),
          listClients({ q: term })
        ]);
        if (cancelled) return;
        setCases(c.data.slice(0, 6));
        setClients(cl.data.slice(0, 6));
        setActiveIndex(-1);
        setResultsOpen(true);
      } catch {
        if (cancelled) return;
        setCases([]);
        setClients([]);
        setActiveIndex(-1);
        setSearchError(true);
        setResultsOpen(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, term.length < 2 ? 0 : 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  // fecha o dropdown ao clicar fora
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setResultsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(href: string) {
    setResultsOpen(false);
    setSearchOpen(false);
    setQuery("");
    router.push(href);
  }

  const hasResults = cases.length > 0 || clients.length > 0;
  // FE-10: lista linear (casos + clientes, nesta ordem) p/ navegação por setas do combobox.
  const flatResults = [
    ...cases.map((c) => ({ id: `case-${c.id}`, href: `/cases/${c.id}` })),
    ...clients.map((cl) => ({ id: `client-${cl.id}`, href: "/clients" }))
  ];
  const activeId = activeIndex >= 0 ? flatResults[activeIndex]?.id : undefined;

  function handleLogout() {
    clearStoredSession();
    router.replace("/login");
  }

  const meta = session ? (roleMeta[session.role] ?? roleMeta.client) : null;
  const initials = session
    ? session.email.slice(0, 2).toUpperCase()
    : "??";

  return (
    <header className="cv-header sticky top-0 z-30 backdrop-blur-lg backdrop-saturate-150">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">

        {/* Hamburger — mobile only */}
        {onMenuClick && (
          <button
            aria-label="Abrir menu"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg lg:hidden",
              "min-h-11 min-w-11 text-[var(--text2)] hover:bg-[var(--surf3)] hover:text-[var(--text)]",
              "transition-colors duration-fast"
            )}
            onClick={onMenuClick}
          >
            <Menu size={19} />
          </button>
        )}

        {/* Search — busca real em casos + clientes (dropdown de resultados) */}
        <div
          ref={searchRef}
          className={cn(
            "relative transition-all duration-base ease-smooth",
            searchOpen
              ? "flex-1"
              : "hidden w-56 flex-none md:flex md:w-64 lg:w-80"
          )}
        >
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
            size={15}
          />
          <input
            aria-label="Buscar casos e clientes"
            role="combobox"
            aria-expanded={resultsOpen}
            aria-controls="header-search-listbox"
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            autoFocus={searchOpen}
            className={cn(
              "cv-input min-h-11 w-full pl-9 pr-3 text-sm",
              "transition-all duration-base ease-smooth",
              "focus:shadow-glow-teal"
            )}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (hasResults) setResultsOpen(true); }}
            onKeyDown={(e) => {
              // FE-10: navegação por setas do combobox + Enter no item ativo.
              if (e.key === "Escape") { setResultsOpen(false); setActiveIndex(-1); return; }
              if (e.key === "ArrowDown" && flatResults.length) {
                e.preventDefault();
                setResultsOpen(true);
                setActiveIndex((i) => (i + 1) % flatResults.length);
                return;
              }
              if (e.key === "ArrowUp" && flatResults.length) {
                e.preventDefault();
                setActiveIndex((i) => (i <= 0 ? flatResults.length - 1 : i - 1));
                return;
              }
              if (e.key === "Enter") {
                const target = activeIndex >= 0 ? flatResults[activeIndex] : flatResults[0];
                if (target) go(target.href);
              }
            }}
            placeholder="Buscar casos, clientes..."
            type="search"
            value={query}
          />
          {searchOpen && (
            <button
              aria-label="Fechar busca"
              className="absolute right-2.5 top-1/2 flex h-8 min-h-8 w-8 min-w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text3)] transition-colors duration-fast hover:bg-[var(--surf3)] hover:text-[var(--text)]"
              onClick={() => { setSearchOpen(false); setQuery(""); setResultsOpen(false); }}
            >
              <X size={14} />
            </button>
          )}

          {/* Dropdown de resultados */}
          {resultsOpen && query.trim().length >= 2 && (
            // A11Y-A7-03: região viva — o leitor de tela anuncia a chegada dos resultados
            // (ou o "nenhum resultado") sem precisar de foco no dropdown.
            <div
              id="header-search-listbox"
              role="listbox"
              aria-label="Resultados da busca"
              aria-atomic="true"
              aria-live="polite"
              className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-96 overflow-auto rounded-lg border border-[var(--bd)] bg-[var(--surf)] py-1 shadow-xl"
            >
              {loading && (
                <p className="px-3 py-2 text-xs text-[var(--text3)]">Buscando…</p>
              )}
              {!loading && searchError && (
                <p className="px-3 py-2 text-xs text-[var(--danger)]">
                  Não foi possível buscar agora. Tente novamente.
                </p>
              )}
              {!loading && !searchError && !hasResults && (
                <p className="px-3 py-2 text-xs text-[var(--text3)]">
                  Nenhum resultado para “{query.trim()}”.
                </p>
              )}
              {!loading && cases.length > 0 && (
                <div>
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                    Casos
                  </p>
                  {cases.map((c) => (
                    <button
                      key={c.id}
                      id={`case-${c.id}`}
                      role="option"
                      aria-selected={activeId === `case-${c.id}`}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--surf3)]",
                        activeId === `case-${c.id}` && "bg-[var(--surf3)]"
                      )}
                      onClick={() => go(`/cases/${c.id}`)}
                      type="button"
                    >
                      <Briefcase className="shrink-0 text-[var(--teal)]" size={14} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-[var(--text)]">
                          {c.title || c.code}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--text3)]">
                          {c.code}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!loading && clients.length > 0 && (
                <div>
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                    Clientes
                  </p>
                  {clients.map((cl) => (
                    <button
                      key={cl.id}
                      id={`client-${cl.id}`}
                      role="option"
                      aria-selected={activeId === `client-${cl.id}`}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--surf3)]",
                        activeId === `client-${cl.id}` && "bg-[var(--surf3)]"
                      )}
                      onClick={() => go("/clients")}
                      type="button"
                    >
                      <Users className="shrink-0 text-[var(--blue)]" size={14} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-[var(--text)]">
                          {cl.name}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--text3)]">
                          {cl.documentMasked || cl.documentLabel || "—"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile search toggle */}
        {!searchOpen && (
          <button
            aria-label="Buscar"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--text2)] transition-colors duration-fast hover:bg-[var(--surf3)] hover:text-[var(--text)] md:hidden"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={18} />
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right cluster */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle className="hidden sm:flex" />

          {/* Notifications */}
          <NotificationBell />

          {session ? (
            <div className="flex items-center gap-2 pl-1">
              {/* Role + name — sm+ */}
              <div className="hidden text-right sm:block">
                <p className="text-[12px] font-semibold leading-tight text-[var(--text)]">
                  {session.email.split("@")[0]}
                </p>
                {meta && (
                  <span
                    className={cn(
                      "cv-badge px-1.5 py-px text-[9px]",
                      meta.cls
                    )}
                  >
                    {meta.label}
                  </span>
                )}
              </div>

              {/* Avatar — acts as logout button */}
              <button
                aria-label="Sair da sessão"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  "bg-gradient-brand text-[11px] font-bold text-white",
                  "min-h-11 min-w-11 shadow-glow-teal ring-2 ring-[var(--surf)]",
                  "transition-all duration-base hover:shadow-glow-teal-lg hover:scale-105",
                  "active:scale-95"
                )}
                onClick={handleLogout}
                title="Sair da sessão"
                type="button"
              >
                {initials}
              </button>
              <button
                className={cn(
                  "hidden h-8 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700",
                  "cv-btn-secondary min-h-11 px-2.5 text-[11px] font-semibold",
                  "md:flex"
                )}
                onClick={handleLogout}
                type="button"
              >
                <LogOut size={13} />
                Sair
              </button>
            </div>
          ) : (
            <a
              className={cn(
                "cv-btn cv-btn-secondary inline-flex min-h-11 items-center px-3",
                "text-[12px] font-semibold"
              )}
              href="/login"
            >
              Entrar
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
