import type { CaseStatus, Priority, ProductType } from "@/types";
import { PRODUTOS } from "@/lib/produtoConfig";
import { CONTRACT_TYPE_LABELS, productLabel } from "@/lib/reportLabels";

// Opções/constantes estáticas da tela de Casos (extraídas do god file — fe-struct-02).

export const CASES_PAGE_SIZE = 24;

// Labels derivam da fonte canônica (fe-struct-04): só os `id` (chaves) são técnicos e
// permanecem intactos. contract_analysis é alias de produto (productLabel resolve); os
// demais são ContractType (CONTRACT_TYPE_LABELS).
export const contractTypes = [
  { id: "contract_analysis", label: productLabel("contract_analysis") },
  { id: "compra_venda", label: CONTRACT_TYPE_LABELS.compra_venda },
  { id: "prestacao_servicos", label: CONTRACT_TYPE_LABELS.prestacao_servicos },
  { id: "locacao", label: CONTRACT_TYPE_LABELS.locacao },
  { id: "confidencialidade", label: CONTRACT_TYPE_LABELS.confidencialidade },
  { id: "due_diligence", label: CONTRACT_TYPE_LABELS.due_diligence },
  { id: "outro", label: CONTRACT_TYPE_LABELS.outro }
];

export const productOptions: Array<{ id: ProductType; label: string }> = [
  { id: "analise_contratual", label: PRODUTOS.analise_contratual.titulo },
  { id: "dados_partes", label: PRODUTOS.dados_partes.titulo },
  { id: "consulta_objeto", label: PRODUTOS.consulta_objeto.titulo },
  { id: "reuniao_equipe", label: PRODUTOS.reuniao_equipe.titulo }
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
