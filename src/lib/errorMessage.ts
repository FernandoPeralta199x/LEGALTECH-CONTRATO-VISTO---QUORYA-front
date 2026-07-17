import { ApiClientError, ApiNetworkError } from "@/services/apiClient";

const isDev = process.env.NODE_ENV !== "production";

export function errorMessage(
  error: unknown,
  fallback = "Não foi possível carregar os dados."
): string {
  if (error instanceof ApiNetworkError) {
    return isDev
      ? "API local indisponível. Verifique se o backend está rodando em 127.0.0.1:8000 e se você está logado."
      : "Serviço temporariamente indisponível.";
  }

  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Sua sessão expirou. Faça login novamente.";
    }

    if (error.status === 403) {
      return "Você não tem permissão para esta ação.";
    }

    if (error.status === 404) {
      return "Recurso não encontrado.";
    }

    // C3-01: validação (400/422) e regras de negócio (402/409/413/429) — a mensagem do
    // backend é controlada (error_response) e ORIENTA o usuário; não descartá-la em produção.
    if ([400, 402, 409, 413, 422, 429].includes(error.status)) {
      return isDev ? `${error.code}: ${error.message}` : error.message;
    }

    if (error.status >= 500) {
      return isDev
        ? "Erro interno da API local. Verifique os logs do backend."
        : "Erro interno do servidor.";
    }

    return isDev ? `${error.code}: ${error.message}` : "Erro ao comunicar com o servidor.";
  }

  if (error instanceof Error) {
    return isDev ? error.message : fallback;
  }

  return fallback;
}
