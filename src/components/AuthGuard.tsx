"use client";

import { LockKeyhole } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { Button } from "@/components/Button";
import { useDevSessionState } from "@/lib/useDevSession";

type AuthGuardProps = {
  children: ReactNode;
  /** Se informado, apenas estes papéis acessam; os demais veem "Sem permissão".
   *  Defesa em profundidade no FE — o backend também barra por papel (RLS/403). */
  allowedRoles?: readonly string[];
};

function GuardScreen({
  action,
  description,
  live = false,
  title
}: {
  action?: ReactNode;
  description: string;
  live?: boolean;
  title: string;
}) {
  return (
    <main className="cv-app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section
        aria-live={live ? "polite" : undefined}
        className="cv-card w-full max-w-md p-8 text-center"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-[rgba(32,201,151,0.22)] bg-[var(--teal-dim)] text-[var(--teal)]">
          <LockKeyhole aria-hidden="true" size={22} />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-[var(--text)]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text2)]">{description}</p>
        {action}
      </section>
    </main>
  );
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, status } = useDevSessionState();

  useEffect(() => {
    if (status === "invalid" || status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, status]);

  if (status === "loading") {
    return (
      <GuardScreen
        description="Confirmando a sessão dev salva neste navegador."
        live
        title="Verificando acesso local"
      />
    );
  }

  if (session) {
    if (allowedRoles && !allowedRoles.includes(session.role)) {
      return (
        <GuardScreen
          action={
            <Button className="mt-6" href="/dashboard">
              Voltar ao painel
            </Button>
          }
          description="Sua conta não tem permissão para acessar esta área."
          title="Sem permissão"
        />
      );
    }
    return children;
  }

  return (
    <GuardScreen
      action={
        <Button className="mt-6" href="/login">
          Ir para login
        </Button>
      }
      description="Cole um JWT dev válido no login local para acessar esta página."
      title="Acesso restrito"
    />
  );
}
