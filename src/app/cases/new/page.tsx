import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { NewCaseWizard } from "@/components/cases/wizard/NewCaseWizard";

export default function NewCasePage() {
  return (
    <AuthGuard>
      <AppLayout>
        <section className="mx-auto mb-6 w-full max-w-3xl rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--teal)]">
            Novo Pedido
          </p>
          <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight text-[var(--text)]">
            Inicie um novo pedido
          </h1>
          <p className="mt-2 text-xs leading-5 text-[var(--text2)]">
            Este wizard guia o pedido: partes, contrato, produto jurídico,
            módulos e revisão antes da criação operacional.
          </p>
          <p className="mt-2 text-[11px] leading-5 text-[var(--text2)]">
            Ao concluir, o sistema cria o pedido, o caso e os recursos
            necessários para continuar pelo mesmo identificador.
          </p>
        </section>
        <NewCaseWizard />
      </AppLayout>
    </AuthGuard>
  );
}
