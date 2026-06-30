"use client";

import { ContractDropzone } from "./ContractDropzone";
import type { WizardFile } from "./types";

type ContractStepProps = {
  arquivo: WizardFile | null;
  anexarContrato: boolean;
  onChange: (file: WizardFile | null) => void;
  onToggle: (value: boolean) => void;
};

export function ContractStep({
  arquivo,
  anexarContrato,
  onChange,
  onToggle
}: ContractStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Documento base do pedido
        </h2>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Selecione um contrato ou documento local para compor a simulação.
          Nesta versão, ele fica como anexo local do MVP; upload, storage,
          OCR e IA reais seguem no roadmap.
        </p>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--bd)] bg-[var(--surf2)] px-4 py-3">
        <span className="flex flex-col">
          <span className="text-sm font-medium text-[var(--text)]">
            Anexar contrato a este pedido
          </span>
          <span className="text-[11px] text-[var(--text3)]">
            Desative para registrar o pedido sem contrato (anexar depois).
          </span>
        </span>
        <input
          aria-label="Anexar contrato a este pedido"
          checked={anexarContrato}
          className="h-5 w-5 accent-[var(--teal)]"
          onChange={(e) => onToggle(e.target.checked)}
          type="checkbox"
        />
      </label>

      {anexarContrato ? (
        <ContractDropzone file={arquivo} onChange={onChange} />
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--bd)] bg-[var(--surf2)] px-4 py-6 text-center text-xs text-[var(--text3)]">
          Pedido sem contrato anexado. Você poderá anexar um documento depois,
          na aba Documentos do caso.
        </div>
      )}
    </div>
  );
}
