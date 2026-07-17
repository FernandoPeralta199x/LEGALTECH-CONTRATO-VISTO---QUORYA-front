import type { ContractType } from "@/types";
import { PRODUTOS, type Produto } from "@/lib/produtoConfig";

/** Rótulos humanos para os enums exibidos na UI (recomendação, risco, triagem,
 *  produto). Centralizado para não vazar valor bruto (ex.: "unknown", "pending",
 *  "dados_partes") nas telas de Casos, Analista e Relatórios. */
export function recommendationLabel(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "Pendente";
  }

  const labels: Record<string, string> = {
    do_not_proceed: "Não prosseguir",
    human_review_required: "Revisão humana obrigatória",
    proceed: "Prosseguir",
    proceed_with_caution: "Prosseguir com ressalvas"
  };

  return labels[value] ?? value;
}

/** Nível de risco; "unknown"/vazio → "Não avaliado". Fonte ÚNICA do rótulo (UI-02). */
export function riskLabel(value: unknown): string {
  if (typeof value !== "string" || !value || value === "unknown") {
    return "Não avaliado";
  }

  const labels: Record<string, string> = {
    critical: "Crítico",
    high: "Alto",
    low: "Baixo",
    medium: "Médio"
  };

  return labels[value] ?? value;
}

/** Fonte ÚNICA do TOM (cv-badge-*) por nível de risco (UI-02) — antes duplicado em
 *  clients/page.tsx, onde já havia divergido. Ausente/`unknown` → neutro. */
export const RISK_TONE: Record<string, string> = {
  unknown: "cv-badge-muted",
  low: "cv-badge-teal",
  medium: "cv-badge-orange",
  high: "cv-badge-red",
  critical: "cv-badge-red"
};

/** Status operacional da triagem do caso; vazio → "Não iniciada". */
export function triageStatusLabel(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "Não iniciada";
  }

  const labels: Record<string, string> = {
    awaiting_triage: "Aguardando triagem",
    completed: "Concluída",
    failed: "Falhou",
    in_progress: "Em andamento",
    not_started: "Não iniciada",
    pending: "Aguardando",
    queued: "Na fila",
    report_ready: "Relatório pronto",
    running: "Em andamento",
    triage_completed: "Triagem concluída"
  };

  return labels[value] ?? value;
}

/** Rótulos dos tipos de contrato (ContractType) que NÃO são produtos do catálogo.
 *  Fonte canônica TIPADA dos labels de contrato (fe-struct-04). */
export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  compra_venda: "Compra e Venda",
  prestacao_servicos: "Prestação de Serviços",
  locacao: "Locação",
  parceria: "Parceria",
  confidencialidade: "Confidencialidade (NDA)",
  due_diligence: "Due Diligence",
  outro: "Outro"
};

// Aliases legados do backend → chave canônica de PRODUTO (ex.: contract_analysis é o
// mesmo produto que analise_contratual). Mapeamento SÓ de exibição — não altera nenhum
// valor técnico/enviado ao backend.
const PRODUCT_ALIASES: Record<string, Produto> = {
  contract_analysis: "analise_contratual"
};

/** Rótulo do produto jurídico / tipo de contrato (código → nome legível). Resolver
 *  ÚNICO e canônico (fe-struct-04): normaliza alias → PRODUTOS (mesma fonte que o
 *  backend PRODUCTS.title) → CONTRACT_TYPE_LABELS → valor bruto. Consolida os antigos
 *  mapas divergentes de produtoConfig/formatters/reportLabels/caseFormOptions. */
export function productLabel(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "Não informado";
  }

  const produtoKey = PRODUCT_ALIASES[value] ?? value;
  if (produtoKey in PRODUTOS) {
    return PRODUTOS[produtoKey as Produto].titulo;
  }
  if (value in CONTRACT_TYPE_LABELS) {
    return CONTRACT_TYPE_LABELS[value as ContractType];
  }
  return value;
}

/** Status do relatório do caso; null → "Não gerado". Assinatura estrutural para
 *  não acoplar este módulo de rótulos ao tipo Report. */
/** Fonte única do rótulo de status de relatório (lista de casos + detalhe).
 *  Aceita um objeto `{ status }`, uma string de status crua, ou null/undefined. */
export function reportStatusLabel(report: unknown): string {
  const status =
    typeof report === "string"
      ? report
      : report && typeof report === "object" && "status" in report
        ? (report as { status?: unknown }).status
        : undefined;
  if (typeof status !== "string" || !status) {
    return "Não gerado";
  }

  const labels: Record<string, string> = {
    failed: "Falhou",
    generating: "Gerando",
    not_started: "Não iniciado",
    ready: "Pronto",
    in_review: "Em revisão",
    approved: "Aprovado",
    rejected: "Rejeitado",
    delivered: "Entregue",
    draft: "Rascunho"
  };

  return labels[status] ?? status;
}

/** Fonte única do rótulo do modo de origem dos dados (lista + detalhe do caso).
 *  Origem ausente/desconhecida NÃO é "api" (seria mentir sobre a procedência do
 *  dado); devolve um rótulo neutro e honesto. */
export function sourceModeLabel(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "—";
  }

  const labels: Record<string, string> = {
    hybrid: "híbrido",
    local: "local",
    mock: "mock",
    real: "real",
    simulated: "simulado"
  };

  return labels[value] ?? value;
}
