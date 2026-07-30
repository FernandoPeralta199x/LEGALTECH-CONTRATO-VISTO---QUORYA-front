"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { Button } from "@/components/Button";
import { defaultRouteForPerfil } from "@/lib/nav";
import { useSessionState } from "@/lib/useSession";
import type { SessionPerfil } from "@/types/auth";

type PerfilGuardProps = {
  /** Perfis (RBAC) que podem ver a rota. Espelha a matriz do backend. */
  allowed: readonly SessionPerfil[];
  children: ReactNode;
};

/**
 * Restringe a rota aos perfis informados (eixo `perfil`, ortogonal ao `role`).
 * Bloqueados são redirecionados à sua rota-casa. É conforto/UX + SEC-FE — a
 * segurança real das ações/dados é server-side (`require_perfil`). Perfil
 * ausente ⇒ bloqueado (fail-closed) nas telas sensíveis.
 */
export function PerfilGuard({ allowed, children }: PerfilGuardProps) {
  const router = useRouter();
  const { session, status } = useSessionState();
  const perfil = session?.perfil;
  const isAllowed = perfil !== undefined && allowed.includes(perfil);

  useEffect(() => {
    if (status === "loading" || status === "error") {
      return;
    }
    if (!isAllowed) {
      router.replace(defaultRouteForPerfil(perfil));
    }
  }, [status, isAllowed, perfil, router]);

  if (status === "loading" || status === "error") {
    return null;
  }

  if (isAllowed) {
    return children;
  }

  return (
    <main className="cv-app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="cv-card w-full max-w-md p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-[rgba(249,115,22,0.24)] bg-[var(--orange-dim)] text-[var(--orange)]">
          <ShieldAlert aria-hidden="true" size={22} />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-[var(--text)]">
          Acesso restrito
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text2)]">
          Esta área não está disponível para o seu perfil de acesso.
        </p>
        <Button className="mt-6" href={defaultRouteForPerfil(perfil)}>
          Voltar
        </Button>
      </section>
    </main>
  );
}
