"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { Button } from "@/components/Button";
import { useSessionState } from "@/lib/useSession";

type AdminGuardProps = {
  children: ReactNode;
};

/** Restringe a rota ao papel admin. Redireciona não-admins para o dashboard.
 *  É conforto/UX — a segurança real das ações fica no backend (require_role). */
export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const { session, status } = useSessionState();
  const isAdmin = session?.role === "admin";

  useEffect(() => {
    if (status === "loading" || status === "error") {
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [status, isAdmin, router]);

  if (status === "loading" || status === "error") {
    return null;
  }

  if (isAdmin) {
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
          A área de Administração é exclusiva para o perfil administrador.
        </p>
        <Button className="mt-6" href="/dashboard">
          Voltar ao dashboard
        </Button>
      </section>
    </main>
  );
}
