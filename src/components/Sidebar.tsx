"use client";

import {
  BriefcaseBusiness,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Shield,
  Upload,
  UsersRound,
  Wallet,
  X,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/cn";
import { clearStoredSession } from "@/lib/authStorage";
import { useDevSession } from "@/lib/useDevSession";
import { useModalA11y } from "@/lib/useModalA11y";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Visível apenas para o papel admin. */
  adminOnly?: boolean;
  /** Se informado, visível apenas para estes papéis — deve espelhar o
   *  allowedRoles do AuthGuard da rota, para não exibir link que leva a "Sem
   *  permissão" (INV-01). */
  roles?: readonly string[];
};
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Visão Geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }
    ]
  },
  {
    label: "Operação",
    items: [
      { href: "/cases/new", label: "Novo Pedido", icon: Plus },
      { href: "/cases",     label: "Casos",       icon: BriefcaseBusiness },
      { href: "/documents", label: "Documentos",  icon: Upload },
      { href: "/analyst",   label: "Analista",    icon: ClipboardCheck, roles: ["admin", "analyst"] },
      { href: "/reports",   label: "Relatórios",  icon: FileText }
    ]
  },
  {
    label: "Gestão",
    items: [
      { href: "/clients",   label: "Clientes",      icon: UsersRound },
      { href: "/admin",     label: "Administração", icon: Shield, adminOnly: true },
      { href: "/financial", label: "Financeiro",    icon: Wallet, adminOnly: true }
    ]
  },
  {
    label: "Sistema",
    items: [
      { href: "/settings", label: "Configurações", icon: Settings }
    ]
  }
];

/** Grupos visíveis para o papel: itens adminOnly só aparecem para admin e itens
 *  com `roles` só para os papéis listados (espelham o gate da rota).
 *  (Filtro de UX — a segurança real é o backend, via require_role/require_writer.) */
function visibleNavGroups(role: string | undefined): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (!item.adminOnly || role === "admin") &&
          (!item.roles || (role !== undefined && item.roles.includes(role)))
      )
    }))
    .filter((group) => group.items.length > 0);
}

function isNavItemActive(pathname: string, href: string) {
  if (href === "/cases") {
    return (
      pathname === "/cases" ||
      (pathname.startsWith("/cases/") && !pathname.startsWith("/cases/new"))
    );
  }

  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      className={cn(
        "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium",
        "transition-all duration-base ease-smooth",
        active
          ? "bg-[var(--teal-dim)] text-[var(--text)] shadow-[inset_0_0_0_1px_rgba(32,201,151,0.18)]"
          : "text-[var(--text2)] hover:bg-[var(--surf3)] hover:text-[var(--text)]"
      )}
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {/* Active left bar */}
      {active && (
        <span className="absolute left-0 top-1.5 h-6 w-0.5 rounded-r-full bg-[var(--teal)] shadow-glow-teal" />
      )}

      <Icon
        aria-hidden="true"
        className={cn(
          "shrink-0 transition-all duration-base",
          active
            ? "text-[var(--teal)]"
            : "text-[var(--text3)] group-hover:text-[var(--text2)]"
        )}
        size={15}
      />

      <span className="flex-1 truncate">{label}</span>

      {active && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--teal)] opacity-80" />
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const session = useDevSession();
  const groups = visibleNavGroups(session?.role);

  const isActive = (href: string) => isNavItemActive(pathname, href);

  return (
    <aside className="cv-sidebar sticky top-0 hidden h-screen w-64 shrink-0 flex-col backdrop-blur-lg backdrop-saturate-150 lg:flex">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link className="group flex items-center gap-3" href="/">
          <Image
            alt="Contrato Visto"
            className="h-12 w-12 shrink-0 rounded-lg object-contain transition-transform duration-base group-hover:scale-105"
            height={48}
            priority
            src="/logo-contrato-visto.png"
            width={48}
          />
          <div>
            <span className="block text-[13px] font-bold text-[var(--text)]">
              Contrato Visto
            </span>
            <span className="block text-[10px] text-[var(--text2)]">
              MVP local controlado
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        {groups.map((group) => (
          <div className="mt-4" key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase text-[var(--text3)]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  active={isActive(item.href)}
                  href={item.href}
                  icon={item.icon}
                  key={item.href}
                  label={item.label}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Status pill */}
      <div className="border-t border-[var(--bd)] px-4 py-4">
        <div className="rounded-lg border border-[rgba(32,201,151,0.22)] bg-[var(--teal-dim)] px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--teal)] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--teal)]" />
            </span>
            <p className="text-[11px] font-semibold text-[var(--teal)]">
              MVP local
            </p>
          </div>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text2)]">
            API local com fallback de desenvolvimento.
          </p>
        </div>
      </div>
    </aside>
  );
}

/* ── Mobile Sidebar ──────────────────────────────────────────────────────── */
type MobileSidebarProps = { open: boolean; onClose: () => void };

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useDevSession();
  const groups = visibleNavGroups(session?.role);
  // Foco inicial + restauração, ESC fecha e trap de Tab enquanto aberto (A11Y-04).
  const drawerRef = useModalA11y<HTMLElement>(open, onClose);

  const isActive = (href: string) => isNavItemActive(pathname, href);

  function handleLogout() {
    clearStoredSession();
    onClose();
    router.replace("/login");
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden",
          "transition-opacity duration-slow ease-smooth",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        aria-label="Menu de navegação"
        aria-modal="true"
        className={cn(
          "cv-mobile-menu fixed inset-y-0 left-0 z-50 flex w-72 max-w-[88vw] flex-col backdrop-blur-lg backdrop-saturate-150 lg:hidden",
          "transition-transform duration-slow ease-smooth",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        inert={!open}
        ref={drawerRef}
        role="dialog"
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link
            className="flex items-center gap-3"
            href="/"
            onClick={onClose}
          >
            <Image
              alt="Contrato Visto"
              className="h-12 w-12 rounded-lg object-contain"
              height={48}
              src="/logo-contrato-visto.png"
              width={48}
            />
            <span className="text-[13px] font-bold text-[var(--text)]">
              Contrato Visto
            </span>
          </Link>
          <button
            aria-label="Fechar menu"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              "min-h-11 min-w-11 text-[var(--text2)] hover:bg-[var(--surf3)] hover:text-[var(--text)]",
              "transition-colors duration-fast"
            )}
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>

        <div className="px-5">
          <div className="flex items-center justify-between rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-3 py-2">
            <span className="text-xs font-semibold text-[var(--text2)]">Tema</span>
            <ThemeToggle />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {groups.map((group) => (
            <div className="mt-4" key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase text-[var(--text3)]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    active={isActive(item.href)}
                    href={item.href}
                    icon={item.icon}
                    key={item.href}
                    label={item.label}
                    onClick={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--bd)] px-4 py-4">
          <button
            className={cn(
              "cv-btn cv-btn-secondary flex w-full items-center justify-center gap-2 text-xs font-semibold"
            )}
            onClick={handleLogout}
            type="button"
          >
            <LogOut size={14} />
            Sair da sessão
          </button>
        </div>
      </aside>
    </>
  );
}
