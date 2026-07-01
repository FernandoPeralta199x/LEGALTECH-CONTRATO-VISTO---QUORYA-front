import { apiClient } from "./apiClient";
import { shouldUseMockFallback } from "./fallback";

type BackendDashboardStats = {
  total_cases?: number;
  total_clients?: number;
  total_requests?: number;
  cases_by_status?: Record<string, number>;
};

export type DashboardStats = {
  totalCases: number;
  totalClients: number;
  totalRequests: number;
  casesByStatus: Record<string, number>;
};

export type DashboardStatsResult = {
  data: DashboardStats | null;
  source: "api" | "mock";
};

export async function getDashboardStats(): Promise<DashboardStatsResult> {
  try {
    const response = await apiClient.get<BackendDashboardStats>(
      "/api/v1/dashboard/stats"
    );
    const d = response.data ?? {};
    return {
      data: {
        totalCases: d.total_cases ?? 0,
        totalClients: d.total_clients ?? 0,
        totalRequests: d.total_requests ?? 0,
        casesByStatus: d.cases_by_status ?? {}
      },
      source: "api"
    };
  } catch (error) {
    if (!shouldUseMockFallback(error)) {
      throw error;
    }
    return { data: null, source: "mock" };
  }
}
