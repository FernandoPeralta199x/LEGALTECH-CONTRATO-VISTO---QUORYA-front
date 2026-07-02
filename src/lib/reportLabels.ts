/** Rótulos humanos para os enums de recomendação do relatório (compartilhado
 *  entre o detalhe do caso e a lista de Relatórios/entrega). */
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
