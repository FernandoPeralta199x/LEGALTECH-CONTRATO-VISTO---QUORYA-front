import {
  BriefcaseBusiness,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Plus,
  Settings,
  Shield,
  Upload,
  UsersRound,
  Wallet,
  type LucideIcon
} from "lucide-react";

import type { SessionPerfil } from "@/types/auth";

export type NavItemDef = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Visível apenas para o papel admin (eixo `role`). */
  adminOnly?: boolean;
  /** Se informado, visível apenas para estes papéis (eixo `role`) — deve
   *  espelhar o allowedRoles do AuthGuard da rota (INV-01). */
  roles?: readonly string[];
  /** Perfis (eixo `perfil`) que enxergam a tela. Espelha a matriz do backend
   *  (`require_perfil` é a autoridade — a sidebar só reflete, SEC-FE).
   *  Ausente = visível para todos os perfis. */
  perfis?: readonly SessionPerfil[];
};

export type NavGroupDef = { label: string; items: NavItemDef[] };

// Matriz de telas por perfil (PERFIS_ACESSO_SPEC §2):
//   administrador → tudo · empresarial → sem Analista/Clientes/Admin/Financeiro
//   cliente_comum → Novo Pedido, Casos, Relatórios, Configurações
export const navGroups: NavGroupDef[] = [
  {
    label: "Visão Geral",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        perfis: ["administrador", "empresarial"]
      }
    ]
  },
  {
    label: "Operação",
    items: [
      { href: "/cases/new", label: "Novo Pedido", icon: Plus },
      { href: "/cases", label: "Casos", icon: BriefcaseBusiness },
      {
        href: "/documents",
        label: "Documentos",
        icon: Upload,
        perfis: ["administrador", "empresarial"]
      },
      {
        href: "/analyst",
        label: "Analista",
        icon: ClipboardCheck,
        roles: ["admin", "analyst"],
        perfis: ["administrador"]
      },
      { href: "/reports", label: "Relatórios", icon: FileText }
    ]
  },
  {
    label: "Gestão",
    items: [
      {
        href: "/clients",
        label: "Clientes",
        icon: UsersRound,
        perfis: ["administrador"]
      },
      {
        href: "/admin",
        label: "Administração",
        icon: Shield,
        adminOnly: true,
        perfis: ["administrador"]
      },
      {
        href: "/financial",
        label: "Financeiro",
        icon: Wallet,
        adminOnly: true,
        perfis: ["administrador"]
      }
    ]
  },
  {
    label: "Sistema",
    items: [{ href: "/settings", label: "Configurações", icon: Settings }]
  }
];

/**
 * Grupos/itens visíveis para o par (role, perfil). Filtro de UX que ESPELHA a
 * autoridade do backend (require_role + require_perfil) — a segurança real é
 * server-side; a sidebar nunca decide sozinha (SEC-FE). Perfil ausente esconde
 * as telas perfil-restritas (fail-closed no que é sensível).
 */
export function visibleNavGroups(
  role: string | undefined,
  perfil: SessionPerfil | undefined
): NavGroupDef[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (!item.adminOnly || role === "admin") &&
          (!item.roles || (role !== undefined && item.roles.includes(role))) &&
          (!item.perfis ||
            (perfil !== undefined && item.perfis.includes(perfil)))
      )
    }))
    .filter((group) => group.items.length > 0);
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/cases") {
    return (
      pathname === "/cases" ||
      (pathname.startsWith("/cases/") && !pathname.startsWith("/cases/new"))
    );
  }

  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

/**
 * Rota-casa por perfil — destino seguro ao redirecionar um usuário bloqueado
 * por rota. `/cases` é visível a TODOS os perfis, então é o fallback universal
 * (nunca gera loop de redirecionamento).
 */
export function defaultRouteForPerfil(
  perfil: SessionPerfil | undefined
): string {
  if (perfil === "administrador" || perfil === "empresarial") {
    return "/dashboard";
  }
  return "/cases";
}
