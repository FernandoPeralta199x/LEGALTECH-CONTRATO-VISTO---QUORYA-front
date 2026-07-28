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
                className="pressable inline-flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white shadow-glow-teal transition hover:bg-brand-teal-dark"
                href="/cases/new"
              >
                <Activity size={15} />
                Novo Pedido
              </Link>
              <Link
                className="pressable inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surf)] px-3.5 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-brand-teal/40"
                href="/settings"
              >
                <Settings size={15} />
                Configurações
              </Link>
              <Link
                className="pressable inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surf)] px-3.5 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-brand-teal/40"
                href="/admin/pricing"
              >
                <DollarSign size={15} />
                Pricing
              </Link>
            </>
          }
          description="Gestão de equipe, papéis e permissões da operação."
          eyebrow="Administração"
          title="Governança operacional"
        />

        {/* ── Em construção (faixa compacta) ── */}
        <div className="mb-6 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 shrink-0 text-amber-400" size={16} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text)]">
                Recursos em desenvolvimento
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
                Os recursos abaixo serão habilitados em breve:
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {[
                  "Equipe & convites",
                  "Organizações / Tenants",
                  "Auditoria",
                  "Billing",
                  "Sessões",
                  "RBAC",
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
            Acesse rapidamente as áreas da operação.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { href: "/cases", label: "Casos" },
              { href: "/documents", label: "Documentos" },
              { href: "/analyst", label: "Analista" },
              { href: "/reports", label: "Relatórios" },
              { href: "/clients", label: "Clientes" }
            ].map((item, index) => (
              <Link
                className="pressable animate-in rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text)] transition hover:border-brand-teal/40"
                href={item.href}
                key={item.href}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <Card
            title="Papéis e permissões"
            description="Visão geral dos papéis de acesso da operação."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  role: "admin",
                  desc: "Acesso total: gestão de equipe, organização e limites da operação."
                },
                {
                  role: "analyst",
                  desc: "Acompanha a triagem e a revisão dos casos."
                },
                {
                  role: "client",
                  desc: "Inicia pedidos e acompanha os próprios casos e documentos."
                },
                {
                  role: "viewer",
                  desc: "Acesso somente leitura às informações."
                }
              ].map((item, index) => (
                <div
                  className="animate-in flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surf2)] p-4"
                  key={item.role}
                  style={{ animationDelay: `${index * 40}ms` }}
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
                    Próximos recursos
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
                    Gestão de membros, convites por e-mail, criação de senha,
                    sessões com localização e notificações por e-mail/WhatsApp
                    serão habilitadas em breve.
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
