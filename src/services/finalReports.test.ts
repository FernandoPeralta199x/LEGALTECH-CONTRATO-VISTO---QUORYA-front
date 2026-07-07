import assert from "node:assert/strict";
import test from "node:test";

import { listFinalReports, uploadFinalReport } from "./finalReports";

function mockSession() {
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
}

test("uploadFinalReport marca o upload com document_classification='final_report'", async () => {
  mockSession();
  let registerBody = "";
  const uploadUrl = "https://storage.local/put/rel?sig=x";
  globalThis.fetch = (async (url, init) => {
    const u = String(url);
    const method = (init?.method ?? "GET").toUpperCase();
    if (u.endsWith("/api/v1/documents") && method === "POST") {
      registerBody = String(init?.body ?? "");
      return Response.json(
        { success: true, data: { document_id: "doc-rel", upload_url: uploadUrl } },
        { status: 201 }
      );
    }
    if (u === uploadUrl && method === "PUT") {
      return new Response(null, { status: 200 });
    }
    if (u.endsWith("/api/v1/documents/doc-rel") && method === "GET") {
      return Response.json({
        success: true,
        data: {
          id: "doc-rel",
          case_id: "case-1",
          filename: "rel.pdf",
          content_type: "application/pdf",
          size_bytes: 10,
          uploaded_at: "2026-05-30T12:00:00.000Z",
          uploaded_by: null,
          metadata: { kind: "final_report" }
        }
      });
    }
    throw new Error(`URL inesperada no mock: ${method} ${u}`);
  }) as typeof fetch;

  const file = new File(["conteudo"], "rel.pdf", { type: "application/pdf" });
  const doc = await uploadFinalReport("case-1", file);

  const body = JSON.parse(registerBody);
  assert.equal(body.document_classification, "final_report");
  assert.equal(doc.kind, "final_report");
});

test("listFinalReports filtra por classification=final_report no servidor", async () => {
  mockSession();
  let getUrl = "";
  globalThis.fetch = (async (url, init) => {
    const method = (init?.method ?? "GET").toUpperCase();
    getUrl = String(url);
    if (method === "GET") {
      return Response.json({ success: true, data: [] });
    }
    throw new Error(`URL inesperada no mock: ${method} ${getUrl}`);
  }) as typeof fetch;

  await listFinalReports("case-9");

  assert.match(getUrl, /case_id=case-9/);
  assert.match(getUrl, /classification=final_report/);
});
