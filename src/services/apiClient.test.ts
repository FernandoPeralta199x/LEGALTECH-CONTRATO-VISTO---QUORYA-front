import assert from "node:assert/strict";
import test from "node:test";

import { getSessionSnapshot } from "@/lib/sessionClient";
import { ApiClientError, apiClient } from "./apiClient";

function setDocumentCookie(cookie: string): () => void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie }
  });
  return () => {
    if (previous) {
      Object.defineProperty(globalThis, "document", previous);
    } else {
      Reflect.deleteProperty(globalThis, "document");
    }
  };
}

test("apiClient chama somente o BFF same-origin e nunca envia Authorization", async () => {
  let capturedUrl = "";
  let capturedHeaders = new Headers();
  let capturedCredentials: RequestCredentials | undefined;

  globalThis.fetch = (async (input, init) => {
    capturedUrl = String(input);
    capturedHeaders = new Headers(init?.headers);
    capturedCredentials = init?.credentials;
    return Response.json({ success: true, data: [] });
  }) as typeof fetch;

  await apiClient.get<unknown[]>("/api/v1/clients");

  assert.equal(capturedUrl, "/api/backend/api/v1/clients");
  assert.equal(capturedHeaders.has("Authorization"), false);
  assert.equal(capturedCredentials, "same-origin");
});

test("apiClient envia double-submit CSRF em mutações", async () => {
  const restoreDocument = setDocumentCookie("quorya_csrf=csrf-token-123");
  let capturedCsrf = "";
  let capturedMethod = "";

  globalThis.fetch = (async (_input, init) => {
    capturedCsrf = new Headers(init?.headers).get("X-CSRF-Token") ?? "";
    capturedMethod = init?.method ?? "";
    return Response.json({ success: true, data: { id: "case-1" } });
  }) as typeof fetch;

  try {
    await apiClient.post("/api/v1/cases", { title: "Contrato" });
    assert.equal(capturedCsrf, "csrf-token-123");
    assert.equal(capturedMethod, "POST");
  } finally {
    restoreDocument();
  }
});

test("apiClient rejeita URLs absolutas e rotas fora de /api/v1", async () => {
  await assert.rejects(
    () => apiClient.get("https://evil.example/api/v1/cases"),
    (error: unknown) => {
      assert.equal(error instanceof ApiClientError, true);
      assert.equal((error as ApiClientError).code, "INVALID_API_PATH");
      return true;
    }
  );
});

test("apiClient preserva metadados do envelope padrão", async () => {
  globalThis.fetch = (async () =>
    Response.json({
      data: { id: "case-1" },
      error: null,
      request_id: "req-standard",
      source_mode: "local",
      success: true,
      timestamp: "2026-06-11T10:00:00.000Z"
    })) as typeof fetch;

  const response = await apiClient.get<{ id: string }>("/api/v1/cases/case-1");
  assert.equal(response.data.id, "case-1");
  assert.equal(response.request_id, "req-standard");
  assert.equal(response.source_mode, "local");
});

test("apiClient preserva mensagem segura de erro do backend", async () => {
  globalThis.fetch = (async () =>
    Response.json({ error: "Cliente não encontrado" }, { status: 404 })) as typeof fetch;

  await assert.rejects(
    () => apiClient.get("/api/v1/clients/missing"),
    (error: unknown) => {
      assert.equal(error instanceof ApiClientError, true);
      assert.equal((error as ApiClientError).message, "Cliente não encontrado");
      assert.equal((error as ApiClientError).status, 404);
      return true;
    }
  );
});

test("apiClient invalida o estado público em falha de autenticação", async () => {
  globalThis.fetch = (async () =>
    Response.json({ message: "Unauthorized" }, { status: 401 })) as typeof fetch;

  await assert.rejects(() => apiClient.get("/api/v1/cases"));
  assert.equal(getSessionSnapshot().status, "unauthenticated");
  assert.equal(getSessionSnapshot().session, null);
});
