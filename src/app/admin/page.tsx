import {
  Activity,
  DollarSign,
  Lock,
  Settings,
  TrendingUp
} from "lucide-react";
import Link from "next/link";

import { AdminGuard } from "@/components/AdminGuard";
import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { Card } from "@/components/Card";
import { PageTitle } from "@/components/PageTitle";

const roleColors: Record<string, string> = {
  admin: "bg-brand-teal/10 text-brand-teal-dark border-brand-teal/20",
  analyst: "bg-brand-teal/10 text-brand-teal-light border-brand-teal/20",
  client: "bg-slate-100 text-slate-700 border-slate-200",
  owner: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  support: "bg-amber-50 text-amber-700 border-amber-500/20",
  viewer: "bg-slate-600/10 text-slate-600 border-slate-600/20"
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  analyst: "Analista",
  client: "Cliente",
  owner: "Owner",
  support: "Suporte",
  viewer: "Viewer"
};

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminGuard>
      <AppLayout>
        <PageTitle
          actions={
            <>
              <Link
                className="inline-flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white shadow-glow-teal transition hover:bg-brand-teal-dark"
                href="/cases/new"
              >
                <Activity size={15} />
                Novo Pedido
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surf)] px-3.5 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-brand-teal/40"
                href="/settings"
              >
                <Settings size={15} />
                Configurações
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surf)] px-3.5 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-brand-teal/40"
                href="/admin/pricing"
              >
                <DollarSign size={15} />
                Pricing
              </Link>
            </>
          }
          description="Visão de governança local do MVP. Convites, gerenciamento real de usuários, RBAC, sessões, auditoria e billing dependem de backend e auth aprovados para produção."
          eyebrow="Administração"
          title="Governança operacional"
        />

        {/* ── Em construção (faixa compacta) ── */}
        <div className="mb-6 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 shrink-0 text-amber-400" size={16} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text)]">
                Governança local — operação administrativa real em construção
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
                Esta tela é uma leitura do MVP local. Os recursos abaixo dependem de
                backend/auth/serviços e serão habilitados numa etapa futura:
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {[
                  "Equipe & convites",
                  "Organizações / Tenants",
                  "Auditoria real",
                  "Billing",
                  "Sessões reais",
                  "RBAC real",
                  "Notificações"
                ].map((item) => (
                  <span
                    className="inline-flex items-center rounded-full border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Atalhos da operação ── */}
        <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surf)] p-5">
          <p className="text-sm font-semibold text-[var(--text)]">
            Atalhos da operação
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
            Revise a operação sem sair da governança; estes atalhos não criam vínculo
            administrativo novo nem acionam serviços externos.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { href: "/cases", label: "Casos" },
              { href: "/documents", label: "Documentos" },
              { href: "/analyst", label: "Analista" },
              { href: "/reports", label: "Relatórios" },
              { href: "/clients", label: "Clientes" }
            ].map((item) => (
              <Link
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text)] transition hover:border-brand-teal/40"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <Card
            title="Roles e permissões como referência local"
            description="Leitura conceitual dos papéis do MVP. Não altera guards, claims, RBAC técnico ou permissões reais."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  role: "admin",
                  desc: "Referência de governança: organiza a leitura local de equipe, organização e limites do MVP."
                },
                {
                  role: "analyst",
                  desc: "Referência operacional: acompanha triagem e revisão conceitual sem aprovação persistida."
                },
                {
                  role: "client",
                  desc: "Referência de relacionamento: inicia pedidos, acompanha casos e documentos quando o fluxo existir."
                },
                {
                  role: "viewer",
                  desc: "Referência de leitura: acompanha informações sem permissões técnicas novas nesta tela."
                }
              ].map((item) => (
                <div
                  className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surf2)] p-4"
                  key={item.role}
                >
                  <span
                    className={`inline-flex shrink-0 items-center rounded border px-2.5 py-1 text-xs font-semibold ${
                      roleColors[item.role] ?? "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {roleLabels[item.role]}
                  </span>
                  <p className="text-xs leading-5 text-[var(--text2)]">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surf2)] p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="mt-0.5 shrink-0 text-brand-teal" size={16} />
                <div>
                  <p className="text-xs font-semibold text-[var(--text)]">
                    Roadmap administrativo
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
                    Membros funcionais, convite/cadastro por e-mail, verificação
                    de e-mail, criação de senha, sessões reais com localização
                    aproximada e notificações por e-mail/WhatsApp ficam para uma
                    etapa com backend, auth e serviços externos definidos.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </AppLayout>
      </AdminGuard>
    </AuthGuard>
  );
}
