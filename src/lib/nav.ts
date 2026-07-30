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
  /** Id da tela no backend (PERFIL_TELAS / telas efetivas). O item aparece só se
   *  este id estiver nas `telas` efetivas da sessão — fonte da verdade é o backend
   *  (Modelo B: base do perfil ∪ abas liberadas); a sidebar apenas espelha (SEC-FE). */
  tela: string;
  /** Gate ADICIONAL por role (eixo escrita/operação). Ex.: Analista exige admin/analyst,
   *  espelhando o allowedRoles do AuthGuard da rota (INV-01). */
  roles?: readonly string[];
};

export type NavGroupDef = { label: string; items: NavItemDef[] };

export const navGroups: NavGroupDef[] = [
  {
    label: "Visão Geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tela: "dashboard" }
    ]
  },
  {
    label: "Operação",
    items: [
      { href: "/cases/new", label: "Novo Pedido", icon: Plus, tela: "novo_pedido" },
      { href: "/cases", label: "Casos", icon: BriefcaseBusiness, tela: "casos" },
      { href: "/documents", label: "Documentos", icon: Upload, tela: "documentos" },
      {
        href: "/analyst",
        label: "Analista",
        icon: ClipboardCheck,
        tela: "analista",
        roles: ["admin", "analyst"]
      },
      { href: "/reports", label: "Relatórios", icon: FileText, tela: "relatorios" }
    ]
  },
  {
    label: "Gestão",
    items: [
      { href: "/clients", label: "Clientes", icon: UsersRound, tela: "clientes" },
      { href: "/admin", label: "Administração", icon: Shield, tela: "administracao" },
      { href: "/financial", label: "Financeiro", icon: Wallet, tela: "financeiro" }
    ]
  },
  {
    label: "Sistema",
    items: [
      { href: "/settings", label: "Configurações", icon: Settings, tela: "configuracoes" }
    ]
  }
];

/**
 * Grupos/itens visíveis para as `telas` efetivas + o `role`. Filtro de UX que ESPELHA
 * a autoridade do backend (require_tela/require_perfil + require_role) — a segurança
 * real é server-side; a sidebar nunca decide sozinha (SEC-FE). `telas` ausente
 * (sessão carregando/legada) => nada aparece (fail-closed).
 */
export function visibleNavGroups(
  telas: readonly string[] | undefined,
  role: string | undefined
): NavGroupDef[] {
  const allowed = new Set(telas ?? []);
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          allowed.has(item.tela) &&
          (!item.roles || (role !== undefined && item.roles.includes(role)))
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
 * Rota-casa por perfil — destino seguro ao redirecionar um usuário bloqueado por
 * rota. `/cases` é visível a TODOS os perfis, então é o fallback universal (nunca
 * gera loop de redirecionamento).
 */
export function defaultRouteForPerfil(
  perfil: SessionPerfil | undefined
): string {
  if (perfil === "administrador" || perfil === "empresarial") {
    return "/dashboard";
  }
  return "/cases";
}
