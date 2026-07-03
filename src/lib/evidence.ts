/** Renderer controlado do `normalized_result` de cada provedor de triagem.
 *  Traduz chaves, mascara PII e formata valores para exibição/impressão — nunca
 *  renderiza JSON cru sem tratamento (recomendação do Codex review). */

const KEY_LABELS: Record<string, string> = {
  aliases: "Apelidos",
  analysis_type: "Tipo de análise",
  bounced_checks: "Cheques devolvidos",
  clauses_found: "Cláusulas encontradas",
  complaints: "Reclamações",
  confidence: "Confiança",
  cpf_cnpj: "CPF/CNPJ",
  economic_group: "Grupo econômico",
  file_path: "Arquivo",
  found: "Encontrado",
  key_findings: "Pontos-chave",
  last_complaint_date: "Última reclamação",
  last_query_date: "Última consulta",
  last_update: "Atualizado em",
  lawsuits: "Processos",
  mime_type: "Tipo de arquivo",
  ok: "Concluído",
  overall_risk: "Risco geral",
  pages: "Páginas",
  pendencies: "Pendências",
  person_type: "Tipo de pessoa",
  protests: "Protestos",
  recomendacao: "Recomendação",
  registration_status: "Situação cadastral",
  reputation: "Reputação",
  resolution_rate: "Índice de resolução",
  risks: "Riscos",
  score: "Score",
  score_range: "Faixa de score",
  summary: "Resumo",
  text: "Texto extraído",
  total: "Total",
  word_count: "Palavras"
};

// Chaves que podem carregar PII — mascaradas na exibição e no PDF.
const PII_KEYS = new Set([
  "cpf_cnpj", "cpf", "cnpj", "document", "documento", "document_number",
  "rg", "email", "e_mail", "phone", "telefone", "address", "endereco"
]);

const MAX_INLINE = 140;

function humanize(key: string): string {
  const spaced = key.replace(/_/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : key;
}

export function evidenceLabel(key: string): string {
  return KEY_LABELS[key] ?? humanize(key);
}

function maskString(value: string): string {
  const v = value.trim();
  if (!v) return "—";
  if (v.includes("@")) {
    const [user, domain] = v.split("@");
    return `${user.slice(0, 1)}***@${domain ?? ""}`;
  }
  const digits = v.replace(/\D/g, "");
  if (digits.length >= 4) return `***${digits.slice(-2)}`;
  return "***";
}

export type EvidenceRow = {
  key: string;
  label: string;
  value: string;
  /** Valor longo (texto/arrays) — mostrar truncado, detalhe fica no "Ver tudo". */
  long: boolean;
};

/** Linhas chave→valor (topo do objeto), com PII mascarada e vazios descartados. */
export function evidenceRows(
  normalized: Record<string, unknown> | null | undefined
): EvidenceRow[] {
  if (!normalized || typeof normalized !== "object") return [];
  const rows: EvidenceRow[] = [];
  for (const [key, raw] of Object.entries(normalized)) {
    const masked = PII_KEYS.has(key);
    let value: string;
    let long = false;
    if (raw === null || raw === undefined) {
      value = "—";
    } else if (typeof raw === "boolean") {
      value = raw ? "Sim" : "Não";
    } else if (typeof raw === "number") {
      value = String(raw);
    } else if (typeof raw === "string") {
      value = masked ? maskString(raw) : raw;
      long = value.length > MAX_INLINE;
    } else if (Array.isArray(raw)) {
      value = `${raw.length} ${raw.length === 1 ? "item" : "itens"}`;
      long = raw.length > 0;
    } else {
      value = JSON.stringify(raw);
      long = value.length > MAX_INLINE;
    }
    if (value === "" || value === "—" && raw === "") continue;
    rows.push({ key, label: evidenceLabel(key), value, long });
  }
  return rows;
}

/** Cópia do payload com as chaves de PII de topo mascaradas — para o "Ver tudo"/PDF. */
export function maskedNormalized(
  normalized: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!normalized || typeof normalized !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(normalized)) {
    out[key] = PII_KEYS.has(key) && typeof raw === "string" ? maskString(raw) : raw;
  }
  return out;
}

/** Texto truncado para não estourar cards nem PDFs (ex.: texto do OCR). */
export function truncate(value: string, max = 500): string {
  return value.length > max ? `${value.slice(0, max)} […]` : value;
}
