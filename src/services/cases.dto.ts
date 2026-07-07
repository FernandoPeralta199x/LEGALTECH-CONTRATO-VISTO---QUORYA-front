/**
 * DTOs do backend para o domínio de casos — shapes crus (snake_case) retornados
 * pelos endpoints /cases, /requests e /cases/{id}/aggregate.
 *
 * Split do antigo god-file cases.ts (1586 linhas):
 *   cases.dto.ts      -> tipos Backend* (este arquivo)
 *   cases.mappers.ts  -> conversão Backend* -> domínio do front
 *   cases.fallback.ts -> mocks/fallback local (API indisponível)
 *   cases.ts          -> somente as chamadas de API
 */
import type { InstallmentOption } from "./pricing";

export type BackendCase = {
  id: string;
  client_id: string;
  case_type: string;
  status: string;
  priority: "low" | "normal" | "high" | "urgent";
  code?: string | null;
  title?: string | null;
  product_type?: string | null;
  product_label?: string | null;
  metadata: Record<string, unknown>;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BackendOperationalCase = {
  id?: string;
  case_id?: string;
  request_id?: string | null;
  code?: string;
  title?: string;
  description?: string;
  case_type?: string;
  product_type?: string;
  product_label?: string;
  client_id?: string | null;
  client_name?: string | null;
  status?: string;
  progress?: number;
  risk_level?: string;
  recommendation?: string | null;
  parties_count?: number;
  documents_count?: number;
  triage_status?: string;
  report_status?: string;
  source_mode?: string;
  created_at?: string;
  updated_at?: string;
};

export type BackendCaseListPage = {
  items: BackendOperationalCase[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type BackendCaseListPayload = BackendCase[] | BackendCaseListPage;

export type BackendLegalRequest = {
  id: string;
  code: string;
  organization_id: string;
  created_by: string;
  product_type: string;
  product_label: string;
  title: string;
  description: string;
  status: string;
  source_mode: string;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
};

export type BackendAggregateCase = {
  id: string;
  request_id: string | null;
  code: string;
  organization_id: string;
  created_by: string;
  client_id?: string | null;
  client_name?: string | null;
  product_type: string;
  product_label: string;
  title: string;
  description: string;
  status: string;
  progress: number;
  risk_level: string;
  recommendation: string | null;
  source_mode: string;
  is_local_simulation: boolean;
  created_at: string;
  updated_at: string;
};

export type BackendAggregateParty = {
  id: string;
  case_id: string;
  organization_id: string;
  name: string;
  document_masked: string | null;
  document_type: string;
  person_type: string;
  role: string;
  email: string | null;
  email_masked: string | null;
  phone: string | null;
  phone_masked: string | null;
  status: string;
  risk_level: string;
  provider_status_summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type BackendAggregateDocument = {
  id: string;
  case_id: string;
  organization_id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  storage_provider: string;
  storage_key: string;
  status: string;
  ocr_status: string;
  ai_read_status: string;
  preview_available: boolean;
  download_available: boolean;
  uploaded_at: string | null;
  updated_at: string;
};

export type BackendAggregateTimelineEvent = {
  id: string;
  case_id: string;
  organization_id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  source: string;
  source_mode: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BackendAggregateTriageModule = {
  id: string;
  case_id: string;
  organization_id: string;
  module_key: string;
  module_label: string;
  provider: string;
  status: string;
  source_mode: string;
  required: boolean;
  reason: string;
  started_at: string | null;
  finished_at: string | null;
  attempts: number;
  error_code: string | null;
  error_message: string | null;
  summary: string | null;
  result_ref: string | null;
  raw_result_ref: string | null;
  created_at: string;
  updated_at: string;
};

export type BackendAggregateProviderResult = {
  id: string;
  case_id: string;
  triage_module_id: string;
  organization_id: string;
  provider: string;
  provider_request_id: string | null;
  source_mode: string;
  status: string;
  input_hash: string;
  raw_result_ref: string | null;
  normalized_result: Record<string, unknown>;
  summary: string | null;
  risk_signals: string[];
  confidence: number | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type BackendAggregateReport = {
  id: string;
  case_id: string;
  organization_id: string;
  status: string;
  version: number;
  summary: string;
  findings: string[];
  legal_risks: string[];
  commercial_risks: string[];
  reputational_risks: string[];
  contractual_risks: string[];
  missing_information: string[];
  recommendation: string;
  confidence: number | null;
  limitations: string[];
  source_refs: Array<Record<string, unknown> | string>;
  generated_by: string | null;
  generated_at: string | null;
  updated_at: string;
};

export type BackendAggregateSummary = {
  case_id: string;
  organization_id: string;
  parties_count: number;
  documents_count: number;
  timeline_count?: number;
  triage_status: string;
  report_status: string;
  risk_level: string;
  recommendation?: string | null;
  progress: number;
  latest_event_at: string | null;
  source_mode: string;
  updated_at: string;
};

export type BackendInstallmentScheduleItem = {
  numero: number;
  vencimento: string;
  valor_cents: number;
};

export type BackendInstallmentPlanPayment = {
  provider?: string;
  mode?: string;
  status?: string;
  method?: string;
  external_reference?: string | null;
  requested_at?: string | null;
  // payment_form (allowlist do backend). Para cartão: brand/last4/authorization_code/simulated.
  payment_form?: {
    type?: string;
    brand?: string;
    last4?: string;
    authorization_code?: string;
    simulated?: boolean;
  } | null;
};

export type BackendInstallmentPlan = {
  version?: number;
  pricing_config_version?: number;
  selected_at?: string | null;
  source_total_cents?: number;
  method?: string;
  parcelas?: number;
  has_juros?: boolean;
  juros_mensal_bps?: number;
  valor_total_cents?: number;
  acrescimo_cents?: number;
  currency?: string;
  schedule?: BackendInstallmentScheduleItem[];
  payment?: BackendInstallmentPlanPayment | null;
};

export type BackendCaseAggregate = {
  case: BackendAggregateCase;
  request: BackendLegalRequest | null;
  parties: BackendAggregateParty[];
  documents: BackendAggregateDocument[];
  timeline: BackendAggregateTimelineEvent[];
  triage_modules: BackendAggregateTriageModule[];
  provider_results: BackendAggregateProviderResult[];
  report: BackendAggregateReport | null;
  summary: BackendAggregateSummary;
  payment_status?: string | null;
  installment_plan?: BackendInstallmentPlan | null;
  installment_options?: InstallmentOption[] | null;
  pricing_config_version?: number | null;
  total_price_cents?: number | null;
  payment_mode?: string | null;
};

export type BackendWizardSubmitResponse = BackendLegalRequest & {
  request_id?: string;
  request_status?: string;
  case_id?: string;
  case_code?: string;
  case_status?: string;
  documents_count?: number;
  parties_count?: number;
  triage_modules_count?: number;
  timeline_events_count?: number;
};
