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

/** Nível de risco do caso; "unknown"/vazio → "Não informado". */
export function riskLabel(value: unknown): string {
  if (typeof value !== "string" || !value || value === "unknown") {
    return "Não informado";
  }

  const labels: Record<string, string> = {
    critical: "Crítico",
    high: "Alto",
    low: "Baixo",
    medium: "Médio"
  };

  return labels[value] ?? value;
}

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

/** Rótulo do produto jurídico (código do wizard/backend → nome legível). */
export function productLabel(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "Não informado";
  }

  const labels: Record<string, string> = {
    analise_contratual: "Análise Contratual",
    compra_venda: "Compra e Venda",
    confidencialidade: "Confidencialidade (NDA)",
    consulta_objeto: "Consulta do Objeto",
    contract_analysis: "Análise Contratual",
    dados_partes: "Dados das Partes",
    due_diligence: "Due Diligence",
    locacao: "Locação",
    outro: "Outro",
    parceria: "Parceria",
    prestacao_servicos: "Prestação de Serviços",
    reuniao_equipe: "Reunião com Equipe"
  };

  return labels[value] ?? value;
}

/** Status do relatório do caso; null → "Não gerado". Assinatura estrutural para
 *  não acoplar este módulo de rótulos ao tipo Report. */
export function reportStatusLabel(report: { status: string } | null): string {
  if (!report) return "Não gerado";

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

  return labels[report.status] ?? report.status;
}
