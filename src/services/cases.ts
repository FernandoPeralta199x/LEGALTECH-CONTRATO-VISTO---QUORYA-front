/**
 * Service de casos — SOMENTE as chamadas de API (+fallback local explícito).
 *
 * Split do antigo god-file (1586 linhas):
 *   cases.dto.ts      -> tipos Backend* (shapes crus do backend)
 *   cases.mappers.ts  -> conversão Backend* -> domínio do front
 *   cases.fallback.ts -> mocks/fallback local (API indisponível)
 *   cases.ts          -> este arquivo (API pública do service)
 */
import { PRODUTOS } from "@/lib/produtoConfig";
import type {
  Case,
  CaseAggregate,
  CaseCreate,
  CaseListFilters,
  CaseUpdate,
  Client,
  InstallmentPlan,
  PaymentMethod,
  PaymentStatus
} from "@/types";
import {
  findStoredLocalCase,
  getStoredLocalCases,
  removeStoredLocalCase,
  saveLocalCaseFromWizard,
  saveStoredLocalCase
} from "@/lib/localCases";
import { ApiClientError, apiClient } from "./apiClient";
import { fallbackReason, shouldUseMockFallback, type ServiceResult } from "./fallback";
import type {
  BackendCase,
  BackendCaseAggregate,
  BackendCaseListPayload,
  BackendInstallmentPlan,
  BackendWizardSubmitResponse
} from "./cases.dto";
import {
  buildCaseListQuery,
  isPaginatedCaseList,
  mapBackendCase,
  mapBackendCaseAggregate,
  mapCaseListPayload,
  mapInstallmentPlan,
  mapPaymentStatus,
  mapWizardSubmitPayload,
  mapWizardSubmitResponse,
  selectedWizardModules,
  type WizardOperationalSubmitInput,
  type WizardOperationalSubmitResult
} from "./cases.mappers";
import { makeFallbackAggregate, makeMockCase } from "./cases.fallback";

// Superfície pública preservada: consumidores seguem importando os tipos do
// wizard a partir de "@/services/cases".
export type {
  WizardOperationalSubmitInput,
  WizardOperationalSubmitResult
} from "./cases.mappers";

function resolveListCasesArgs(
  filtersOrClients: CaseListFilters | Client[] = {},
  maybeClients: Client[] = []
): { filters: CaseListFilters; clients: Client[] } {
  if (Array.isArray(filtersOrClients)) {
    return { filters: {}, clients: filtersOrClients };
  }

  return { filters: filtersOrClients, clients: maybeClients };
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function listCases(
  filtersOrClients: CaseListFilters | Client[] = {},
  maybeClients: Client[] = []
): Promise<ServiceResult<Case[]>> {
  const { clients, filters } = resolveListCasesArgs(filtersOrClients, maybeClients);
  try {
    const response = await apiClient.get<BackendCaseListPayload>(
      `/api/v1/cases${buildCaseListQuery(filters)}`
    );
    return {
      data: mapCaseListPayload(response.data, clients),
      source: "api"
    };
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    return {
      data: getStoredLocalCases(),
      fallbackReason: fallbackReason(error),
      source: "mock"
    };
  }
}

export type CaseListPageResult = {
  data: Case[];
  total: number;
  page: number;
  totalPages: number;
  source: "api" | "mock";
  fallbackReason?: string;
};

export async function listCasesPaged(
  filters: CaseListFilters = {},
  clients: Client[] = []
): Promise<CaseListPageResult> {
  try {
    const response = await apiClient.get<BackendCaseListPayload>(
      `/api/v1/cases${buildCaseListQuery(filters)}`
    );
    const payload = response.data;
    const data = mapCaseListPayload(payload, clients);
    if (isPaginatedCaseList(payload)) {
      return {
        data,
        total: payload.total,
        page: payload.page,
        totalPages: payload.total_pages,
        source: "api"
      };
    }
    return { data, total: data.length, page: 1, totalPages: 1, source: "api" };
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }
    const local = getStoredLocalCases();
    return {
      data: local,
      total: local.length,
      page: 1,
      totalPages: 1,
      source: "mock",
      fallbackReason: fallbackReason(error)
    };
  }
}

export async function submitWizardRequest(
  input: WizardOperationalSubmitInput
): Promise<ServiceResult<WizardOperationalSubmitResult>> {
  try {
    const response = await apiClient.post<BackendWizardSubmitResponse>(
      "/api/v1/requests",
      mapWizardSubmitPayload(input)
    );
    return {
      data: mapWizardSubmitResponse(response.data),
      source: "api"
    };
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    const localCase = saveLocalCaseFromWizard(input);
    return {
      data: {
        requestId: localCase.requestId ?? localCase.id,
        caseId: localCase.id,
        caseCode: localCase.code,
        status: localCase.status,
        productType: localCase.product,
        productLabel: localCase.productLabel ?? PRODUTOS[localCase.product].titulo,
        documentsCount: localCase.documentsCount,
        partiesCount: localCase.parties.length,
        triageModulesCount: selectedWizardModules(input.modulos).length,
        timelineEventsCount:
          3 +
          localCase.parties.length +
          localCase.documentsCount +
          (selectedWizardModules(input.modulos).length > 0 ? 1 : 0),
        sourceMode: "local"
      },
      fallbackReason: fallbackReason(error),
      source: "mock"
    };
  }
}

export async function getCaseAggregate(
  caseId: string
): Promise<ServiceResult<CaseAggregate>> {
  const localCase = findStoredLocalCase(caseId);
  if (localCase && !isUuidLike(caseId)) {
    return {
      data: makeFallbackAggregate(localCase),
      // SEC-FE-02: sem fallbackReason, o cache local aparecia SEM marcação, idêntico
      // a um caso real do backend. O motivo alimenta o banner "Fallback local".
      fallbackReason: "Caso local (não sincronizado com o backend).",
      source: "mock"
    };
  }

  try {
    const response = await apiClient.get<BackendCaseAggregate>(
      `/api/v1/cases/${caseId}/aggregate`
    );
    return {
      data: mapBackendCaseAggregate(response.data),
      source: "api"
    };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      const legacy = await getCase(caseId);
      return {
        data: makeFallbackAggregate(legacy.data),
        fallbackReason: legacy.fallbackReason,
        source: legacy.source
      };
    }

    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    if (!localCase) {
      throw error;
    }

    return {
      data: makeFallbackAggregate(localCase),
      fallbackReason: fallbackReason(error),
      source: "mock"
    };
  }
}

export type CasePaymentPayload = {
  parcelas: number;
  method: PaymentMethod;
  pricing_config_version?: number;
  // PRC-02: total que a tela exibiu e o usuário confirmou. O backend responde 409 se
  // divergir do recalculado (config mudou entre o load e o clique), pedindo revisão.
  expected_total_cents?: number;
  idempotency_key: string;
  card_token?: string;
  card_last4?: string;
  card_brand?: string;
  card_holder?: string;
};

export type CasePaymentResult = {
  paymentStatus: PaymentStatus;
  installmentPlan: InstallmentPlan | null;
};

/**
 * Registra o pagamento (simulado) do caso. SEM fallback local por regra do
 * spec §2: nada pode parecer cobrança real quando a API está indisponível —
 * erros sobem para a tela tratar (400/404/409/rede).
 */
export async function createCasePayment(
  caseId: string,
  payload: CasePaymentPayload
): Promise<CasePaymentResult> {
  const response = await apiClient.post<{
    payment_status?: string;
    installment_plan?: BackendInstallmentPlan | null;
  }>(`/api/v1/cases/${caseId}/payment`, payload);

  return {
    paymentStatus: mapPaymentStatus(response.data.payment_status),
    installmentPlan: mapInstallmentPlan(response.data.installment_plan)
  };
}

export async function createCase(
  payload: CaseCreate,
  clients: Client[] = []
): Promise<ServiceResult<Case>> {
  try {
    const response = await apiClient.post<BackendCase>("/api/v1/cases", payload);
    return {
      data: mapBackendCase(response.data, clients),
      source: "api"
    };
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    return {
      data: makeMockCase(payload, clients),
      fallbackReason: fallbackReason(error),
      source: "mock"
    };
  }
}

export async function getCase(
  caseId: string,
  clients: Client[] = []
): Promise<ServiceResult<Case>> {
  const localCase = findStoredLocalCase(caseId);
  if (localCase) {
    return {
      data: localCase,
      fallbackReason: "Caso local (não sincronizado com o backend).", // SEC-FE-02
      source: "mock"
    };
  }

  try {
    const response = await apiClient.get<BackendCase>(`/api/v1/cases/${caseId}`);
    return {
      data: mapBackendCase(response.data, clients),
      source: "api"
    };
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    const legalCase = findStoredLocalCase(caseId);
    if (!legalCase) {
      throw error;
    }

    return {
      data: legalCase,
      fallbackReason: fallbackReason(error),
      source: "mock"
    };
  }
}

export async function updateCase(
  caseId: string,
  payload: CaseUpdate,
  clients: Client[] = []
): Promise<ServiceResult<Case>> {
  try {
    const response = await apiClient.patch<BackendCase>(
      `/api/v1/cases/${caseId}`,
      payload
    );
    return {
      data: mapBackendCase(response.data, clients),
      source: "api"
    };
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }

    const current = findStoredLocalCase(caseId);
    if (!current) {
      throw error;
    }
    const updated = saveStoredLocalCase({
      ...current,
      caseType: payload.case_type ?? current.caseType,
      clientId: payload.client_id ?? current.clientId,
      priority: payload.priority ?? current.priority,
      status: payload.status ?? current.status,
      updatedAt: new Date().toISOString()
    });
    return {
      data: updated,
      fallbackReason: fallbackReason(error),
      source: "mock"
    };
  }
}

export async function deleteCase(
  caseId: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await apiClient.delete<{ id: string; deleted_at: string | null }>(
      `/api/v1/cases/${caseId}`
    );
    return { data: { id: caseId }, source: "api" };
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }
    removeStoredLocalCase(caseId);
    return {
      data: { id: caseId },
      fallbackReason: fallbackReason(error),
      source: "mock"
    };
  }
}
