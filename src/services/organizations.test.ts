import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { listOrgUsers, updateOrgUserTelas } from "./organizations";

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
});

function mockFetch(body: unknown): void {
  global.fetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => body
  })) as unknown as typeof fetch;
}

test("listOrgUsers mapeia snake_case -> camelCase (telas_extra/telas)", async () => {
  mockFetch({
    success: true,
    data: {
      items: [
        {
          id: "u1",
          email: "ana@empresa.com",
          name: "Ana",
          role: "admin",
          status: "active",
          perfil: "cliente_comum",
          telas_extra: ["documentos"],
          telas: ["casos", "documentos", "relatorios"]
        }
      ]
    }
  });

  const users = await listOrgUsers("org-1");
  assert.equal(users.length, 1);
  assert.equal(users[0].perfil, "cliente_comum");
  assert.deepEqual(users[0].telasExtra, ["documentos"]);
  assert.deepEqual(users[0].telas, ["casos", "documentos", "relatorios"]);
});

test("listOrgUsers tolera resposta sem items", async () => {
  mockFetch({ success: true, data: {} });
  assert.deepEqual(await listOrgUsers("org-1"), []);
});

test("updateOrgUserTelas retorna as telas_extra gravadas", async () => {
  mockFetch({ success: true, data: { telas_extra: ["dashboard"] } });
  const saved = await updateOrgUserTelas("org-1", "u1", ["dashboard"]);
  assert.deepEqual(saved, ["dashboard"]);
});
