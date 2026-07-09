import { Info } from "lucide-react";

/** Aviso único de ambiente (MVP local). Some com os disclaimers repetidos por tela;
 *  avisos específicos de uma ação continuam perto da própria ação. */
export function EnvBanner() {
  return (
    <div
      className="mb-5 flex items-center gap-2 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-4 py-2 text-[11px] leading-5 text-[var(--text2)]"
      role="note"
    >
      <Info aria-hidden="true" className="shrink-0 text-[var(--text3)]" size={14} />
      <span>
        <span className="font-semibold text-[var(--text)]">Ambiente local (MVP)</span>
        {" — dados fictícios. Sem Cognito, S3, SQS, OCR, IA/RAG ou e-mail reais nesta fase."}
      </span>
    </div>
  );
}
