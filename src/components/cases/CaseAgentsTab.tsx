"use client";

import { Bot, Play, Printer, RefreshCw } from "lucide-react";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { TriageModuleCard } from "@/components/cases/TriageModuleCard";
import type { ProviderResult, TriageModule } from "@/types";

type CaseAgentsTabProps = {
  triageModules: TriageModule[];
  providerResults: ProviderResult[];
  resultByModule: Map<string, ProviderResult>;
  canWrite: boolean;
  caseIsCompleted: boolean;
  paymentPending: boolean;
  triageHasRun: boolean;
  triageRunning: boolean;
  onPrint: (target: string) => void;
  onRunTriage: () => void;
};

/**
 * Aba "Triagem local" (agents) do caso. PRESENTACIONAL, extraída do god-file
 * cases/[id]/page.tsx: os módulos/resultados e os handlers ficam no pai e
 * chegam por props. Sem mudança de comportamento.
 */
export function CaseAgentsTab({
  triageModules,
  providerResults,
  resultByModule,
  canWrite,
  caseIsCompleted,
  paymentPending,
  triageHasRun,
  triageRunning,
  onPrint,
  onRunTriage
}: CaseAgentsTabProps) {
  return (
    <div className="animate-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="text-brand-teal" size={18} />
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Módulos de triagem do caso
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {providerResults.length > 0 && (
            <Button
              icon={<Printer aria-hidden="true" size={15} />}
              onClick={() => onPrint("all")}
              variant="secondary"
            >
              Imprimir tudo
            </Button>
          )}
          {canWrite && !caseIsCompleted && !paymentPending && (
            <Button
              icon={
                triageHasRun ? (
                  <RefreshCw aria-hidden="true" size={15} />
                ) : (
                  <Play aria-hidden="true" size={15} />
                )
              }
              loading={triageRunning}
              onClick={onRunTriage}
            >
              {triageHasRun ? "Reexecutar triagem" : "Rodar triagem"}
            </Button>
          )}
        </div>
      </div>
      {triageModules.length === 0 ? (
        <EmptyState
          description="Nenhum módulo de triagem foi registrado para este caso."
          icon={<Bot size={20} />}
          title="Triagem ainda não iniciada"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {triageModules.map((module, index) => (
            <div
              className="animate-in"
              key={module.id}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <TriageModuleCard
                module={module}
                onPrint={onPrint}
                result={resultByModule.get(module.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
