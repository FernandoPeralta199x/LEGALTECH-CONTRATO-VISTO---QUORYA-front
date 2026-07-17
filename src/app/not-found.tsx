import { FileQuestion } from "lucide-react";

import { Button } from "@/components/Button";

export default function NotFound() {
  return (
    <main className="cv-app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="cv-card w-full max-w-md p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-[rgba(32,201,151,0.22)] bg-[var(--teal-dim)] text-[var(--teal)]">
          <FileQuestion aria-hidden="true" size={22} />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-[var(--text)]">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text2)]">
          O endereço acessado não existe ou foi movido. Verifique o link ou volte
          para o painel.
        </p>
        <Button className="mt-6" href="/dashboard">
          Voltar ao painel
        </Button>
      </section>
    </main>
  );
}
