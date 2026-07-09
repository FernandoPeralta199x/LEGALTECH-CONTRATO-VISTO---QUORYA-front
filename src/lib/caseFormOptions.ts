import type { CaseStatus, Priority, ProductType } from "@/types";

// Opções/constantes estáticas da tela de Casos (extraídas do god file — fe-struct-02).

export const CASES_PAGE_SIZE = 24;

export const contractTypes = [
  { id: "contract_analysis", label: "Análise Contratual" },
  { id: "compra_venda", label: "Compra e Venda" },
  { id: "prestacao_servicos", label: "Prestação de Serviços" },
  { id: "locacao", label: "Locação" },
  { id: "confidencialidade", label: "Confidencialidade (NDA)" },
  { id: "due_diligence", label: "Due Diligence" },
  { id: "outro", label: "Outro" }
];

export const productOptions: Array<{ id: ProductType; label: string }> = [
  { id: "analise_contratual", label: "Análise contratual" },
  { id: "dados_partes", label: "Dados das partes" },
  { id: "consulta_objeto", label: "Consulta do objeto" },
  { id: "reuniao_equipe", label: "Reunião com equipe" }
];

// Status reais que um caso assume no banco. Usado no filtro (server-side, ?status=)
// e no modal de edição — todos aceitos pelo CaseUpdate (CASE_STATUS_PATTERN).
export const statusFilterOptions: Array<{ id: CaseStatus; label: string }> = [
  { id: "awaiting_triage", label: "Aguardando triagem" },
  { id: "open", label: "Aberto" },
  { id: "in_progress", label: "Em andamento" },
  { id: "report_ready", label: "Relatório pronto" },
  { id: "completed", label: "Concluído" },
  { id: "closed", label: "Fechado" }
];

export type CaseForm = {
  caseType: string;
  clientId: string;
  notes: string;
  priority: Priority;
  product: ProductType;
  title: string;
};

export const emptyCaseForm: CaseForm = {
  caseType: "contract_analysis",
  clientId: "",
  notes: "",
  priority: "normal",
  product: "analise_contratual",
  title: ""
};
