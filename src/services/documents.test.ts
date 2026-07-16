import assert from "node:assert/strict";
import test from "node:test";

import { listDocuments, uploadDocument } from "./documents";

test("listDocuments maps backend documents and reports api source", async () => {
  globalThis.fetch = (async () =>
    Response.json({
      success: true,
      data: [
        {
          id: "doc-api-1",
          case_id: "case-api-1",
          filename: "contrato.pdf",
          content_type: "application/pdf",
          size_bytes: 2048,
          file_hash: null,
          status: "uploaded",
          uploaded_by: null,
          uploaded_at: "2026-05-25T10:00:00.000Z",
          metadata: {},
          created_at: "2026-05-25T10:00:00.000Z",
          updated_at: "2026-05-25T10:00:00.000Z"
        }
      ]
    })) as typeof fetch;

  const result = await listDocuments();

  assert.equal(result.source, "api");
  assert.equal(result.data[0].id, "doc-api-1");
  assert.equal(result.data[0].sizeLabel, "2 KB");
  assert.equal(result.data[0].caseCode, "CASE-API-1");
});

test("uploadDocument segue o fluxo presign (registra JSON, faz PUT, busca) sem organization_id", async () => {
  let registerUrl = "";
  let registerBody = "";
  let putUrl = "";
  let putMethod = "";
  let getUrl = "";
  let authorizationHeader: string | null = null;

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) =>
        key === "legaltech.dev.session.v1"
          ? JSON.stringify({
              email: "dev.local@example.test",
              issuedAt: "2026-05-30T12:00:00.000Z",
              organizationId: "11111111-1111-4111-8111-111111111111",
              role: "admin",
              source: "pasted",
              token: "valid.dev.jwt",
              userId: "22222222-2222-4222-8222-222222222222"
            })
          : null,
      removeItem: () => undefined,
      setItem: () => undefined
    }
  });

  const uploadUrl = "https://storage.local/put/doc-uploaded?sig=abc123";
  const backendDocument = {
    id: "doc-uploaded",
    case_id: "case-api-1",
    filename: "contrato.pdf",
    content_type: "application/pdf",
    size_bytes: 1024,
    file_hash: "sha256:abc123",
    status: "uploaded",
    uploaded_by: "22222222-2222-4222-8222-222222222222",
    uploaded_at: "2026-05-30T12:00:00.000Z",
    metadata: { notes: "Teste local", source: "frontend_local_upload" },
    created_at: "2026-05-30T12:00:00.000Z",
    updated_at: "2026-05-30T12:00:00.000Z"
  };

  globalThis.fetch = (async (url, init) => {
    const u = String(url);
    const method = (init?.method ?? "GET").toUpperCase();

    // 1) registro (presign): POST /api/v1/documents (JSON) -> {document_id, upload_url}
    if (u.endsWith("/api/v1/documents") && method === "POST") {
      registerUrl = u;
      registerBody = String(init?.body ?? "");
      authorizationHeader = new Headers(init?.headers).get("Authorization");
      return Response.json(
        { success: true, data: { document_id: "doc-uploaded", upload_url: uploadUrl } },
        { status: 201 }
      );
    }
    // 2) binário sobe direto ao storage via PUT na URL pré-assinada
    if (u === uploadUrl && method === "PUT") {
      putUrl = u;
      putMethod = method;
      return new Response(null, { status: 200 });
    }
    // 3) leitura do documento registrado
    if (u.endsWith("/api/v1/documents/doc-uploaded") && method === "GET") {
      getUrl = u;
      return Response.json({ success: true, data: backendDocument });
    }
    throw new Error(`URL inesperada no mock: ${method} ${u}`);
  }) as typeof fetch;

  const file = new File(["conteudo"], "contrato.pdf", { type: "application/pdf" });

  const result = await uploadDocument({
    caseId: "case-api-1",
    file,
    metadata: { notes: "Teste local", organization_id: "frontend-ignored" }
  });

  assert.equal(result.source, "api");
  assert.equal(result.data.status, "uploaded");
  // registro é JSON (presign), nunca multipart; sem organization_id (autoridade do back)
  assert.match(registerUrl, /\/api\/v1\/documents$/);
  assert.equal(authorizationHeader, "Bearer valid.dev.jwt");
  const reg = JSON.parse(registerBody);
  assert.equal(reg.case_id, "case-api-1");
  assert.equal(reg.file_name, "contrato.pdf");
  assert.equal(reg.file_type, "pdf");
  assert.equal(reg.file_size_bytes, file.size);
  assert.equal(reg.organization_id, undefined);
  // binário enviado via PUT à URL pré-assinada
  assert.equal(putUrl, uploadUrl);
  assert.equal(putMethod, "PUT");
  // leitura final do documento
  assert.match(getUrl, /\/api\/v1\/documents\/doc-uploaded$/);
});

test("uploadDocument lança quando o PUT ao storage retorna erro HTTP (não engole a falha)", async () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) =>
        key === "legaltech.dev.session.v1"
          ? JSON.stringify({
              email: "dev.local@example.test",
              issuedAt: "2026-05-30T12:00:00.000Z",
              organizationId: "11111111-1111-4111-8111-111111111111",
              role: "admin",
              source: "pasted",
              token: "valid.dev.jwt",
              userId: "22222222-2222-4222-8222-222222222222"
            })
          : null,
      removeItem: () => undefined,
      setItem: () => undefined
    }
  });

  const uploadUrl = "https://storage.local/put/doc-fail?sig=x";
  // O GET final é mockado com sucesso de propósito: sem a checagem de response.ok,
  // o fluxo chegaria aqui e resolveria como sucesso (bug). Com a checagem, o PUT 403 lança antes.
  globalThis.fetch = (async (url, init) => {
    const u = String(url);
    const method = (init?.method ?? "GET").toUpperCase();
    if (u.endsWith("/api/v1/documents") && method === "POST") {
      return Response.json(
        { success: true, data: { document_id: "doc-fail", upload_url: uploadUrl } },
        { status: 201 }
      );
    }
    if (u === uploadUrl && method === "PUT") {
      return new Response("AccessDenied", { status: 403 });
    }
    if (u.endsWith("/api/v1/documents/doc-fail") && method === "GET") {
      return Response.json({
        success: true,
        data: {
          id: "doc-fail",
          case_id: "case-api-1",
          filename: "rel.pdf",
          content_type: "application/pdf",
          size_bytes: 8,
          file_hash: null,
          status: "uploaded",
          uploaded_by: null,
          uploaded_at: "2026-05-30T12:00:00.000Z",
          metadata: {},
          created_at: "2026-05-30T12:00:00.000Z",
          updated_at: "2026-05-30T12:00:00.000Z"
        }
      });
    }
    throw new Error(`URL inesperada no mock: ${method} ${u}`);
  }) as typeof fetch;

  const file = new File(["conteudo"], "rel.pdf", { type: "application/pdf" });

  await assert.rejects(
    () => uploadDocument({ caseId: "case-api-1", file }),
    /storage|enviar|arquivo/i
  );
});
