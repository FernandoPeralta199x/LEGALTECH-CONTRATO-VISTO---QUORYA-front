"use client";

import { LockKeyhole } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { Button } from "@/components/Button";
import { useSessionState } from "@/lib/useSession";

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
  const { error, session, status } = useSessionState();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, status]);

  if (status === "loading") {
    return (
      <GuardScreen
        description="Confirmando sua sessão segura com o servidor."
        live
        title="Verificando acesso"
      />
    );
  }

  if (status === "error") {
    return (
      <GuardScreen
        action={
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        }
        description={error ?? "Não foi possível validar sua sessão agora."}
        title="Serviço indisponível"
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
      description="Faça login para acessar esta página."
      title="Acesso restrito"
    />
  );
}
