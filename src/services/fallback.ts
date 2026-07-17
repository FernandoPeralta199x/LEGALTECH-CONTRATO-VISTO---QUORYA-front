import { isMockFallbackEnabled } from "@/lib/runtimeEnv";
import { ApiNetworkError } from "./apiClient";

// isMockFallbackEnabled mora em lib/runtimeEnv (SEC-FE-01) e é reexportado aqui para
// não quebrar os consumidores que já o importam de services/fallback.
export { isMockFallbackEnabled };

export type DataSource = "api" | "mock";

export type ServiceResult<T> = {
  data: T;
  fallbackReason?: string;
  source: DataSource;
};

export function shouldUseMockFallback(error: unknown): boolean {
  return isMockFallbackEnabled() && error instanceof ApiNetworkError;
}

export function fallbackReason(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Backend indisponivel para desenvolvimento local.";
}
