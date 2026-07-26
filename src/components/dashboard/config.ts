import {
  BriefcaseBusiness,
  ClipboardCheck,
  FileText,
  Plus,
  Shield,
  Upload,
  UserPlus
} from "lucide-react";

// Config estática do dashboard (extraída da página — fe-struct-02). Sem estado nem JSX.

export type ActionBadge =
  | "Base"
  | "Entrada"
  | "Entrega"
  | "Governança"
  | "Insumos"
  | "MVP local"
  | "Operacional"
  | "Simulado";

export const badgeStyle: Record<ActionBadge, string> = {
  Base:
    "bg-[var(--blue-dim)] text-[var(--blue)] border-[rgba(96,165,250,0.25)]",
  Entrada:
    "bg-[var(--teal-dim)] text-[var(--teal)] border-[rgba(32,201,151,0.3)]",
  Entrega:
    "bg-[var(--surf3)] text-[var(--text2)] border-[var(--bd)]",
  Governança:
    "bg-[var(--orange-dim)] text-[var(--orange)] border-[rgba(249,115,22,0.25)]",
  Insumos:
    "bg-[var(--blue-dim)] text-[var(--blue)] border-[rgba(96,165,250,0.25)]",
  Operacional:
    "bg-[var(--teal-dim)] text-[var(--teal)] border-[rgba(32,201,151,0.25)]",
  "MVP local":
    "bg-[var(--blue-dim)] text-[var(--blue)] border-[rgba(96,165,250,0.25)]",
  Simulado:
    "bg-[var(--surf3)] text-[var(--text2)] border-[var(--bd)]"
};

// Status considerados "em andamento" para a contagem local (fallback quando /dashboard/stats indisponível).
export const ACTIVE_STATUSES = new Set<string>([
  "submitted",
  "triagem_pendente",
  "coleta_pendente",
  "processamento_documental",
  "analise_contratual",
  "compliance",
  "minuta_relatorio",
  "revisao_humana",
  "processing",
  "review",
  "approved"
]);

export const processAreas = [
  {
    title: "Novo Pedido",
    description: "Ponto de entrada para criar um novo pedido.",
    href: "/cases/new",
    icon: Plus,
    badge: "Entrada" as ActionBadge,
    primary: true
  },
  {
    title: "Casos",
    description: "Acompanhamento operacional dos pedidos criados.",
    href: "/cases",
    icon: BriefcaseBusiness,
    badge: "Operacional" as ActionBadge,
    primary: false
  },
  {
    title: "Documentos",
    description: "Arquivos e metadados vinculados aos casos.",
    href: "/documents",
    icon: Upload,
    badge: "Insumos" as ActionBadge,
    primary: false
  },
  {
    title: "Analista",
    description: "Triagem e revisão dos casos.",
    href: "/analyst",
    icon: ClipboardCheck,
    badge: "Governança" as ActionBadge,
    primary: false
  },
  {
    title: "Relatórios",
    description: "Geração e entrega de relatórios.",
    href: "/reports",
    icon: FileText,
    badge: "Entrega" as ActionBadge,
    primary: false
  },
  {
    title: "Clientes",
    description: "Base de relacionamento da operação.",
    href: "/clients",
    icon: UserPlus,
    badge: "Base" as ActionBadge,
    primary: false
  },
  {
    title: "Administração",
    description: "Gestão de usuários, papéis e permissões.",
    href: "/admin",
    icon: Shield,
    badge: "Governança" as ActionBadge,
    primary: false,
    adminOnly: true
  }
] as const;
