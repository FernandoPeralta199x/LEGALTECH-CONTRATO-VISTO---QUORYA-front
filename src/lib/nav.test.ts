import assert from "node:assert/strict";
import test from "node:test";

import { visibleNavGroups } from "./nav";

// Espelha o backend PERFIL_TELAS (src/utils/context.py).
const ALL_TELAS = [
  "dashboard",
  "novo_pedido",
  "casos",
  "documentos",
  "analista",
  "relatorios",
  "clientes",
  "administracao",
  "financeiro",
  "configuracoes"
];
const BASE_CLIENTE = ["novo_pedido", "casos", "relatorios", "configuracoes"];

function visibleHrefs(
  telas: readonly string[] | undefined,
  role: string | undefined
): string[] {
  return visibleNavGroups(telas, role)
    .flatMap((group) => group.items.map((item) => item.href))
    .sort();
}

test("administrador (todas as telas) vê tudo", () => {
  const hrefs = visibleHrefs(ALL_TELAS, "admin");
  for (const href of [
    "/dashboard",
    "/cases/new",
    "/cases",
    "/documents",
    "/analyst",
    "/reports",
    "/clients",
    "/admin",
    "/financial",
    "/settings"
  ]) {
    assert.ok(hrefs.includes(href), `deveria ver ${href}`);
  }
});

test("cliente_comum base vê só Novo Pedido, Casos, Relatórios e Configurações", () => {
  const hrefs = visibleHrefs(BASE_CLIENTE, "admin");
  assert.deepEqual(hrefs, ["/cases", "/cases/new", "/reports", "/settings"]);
});

test("aba liberada pelo admin (documentos) passa a aparecer para o cliente", () => {
  const hrefs = visibleHrefs([...BASE_CLIENTE, "documentos"], "admin");
  assert.ok(hrefs.includes("/documents"));
  // não vaza telas da firma só por liberar uma aba
  assert.ok(!hrefs.includes("/admin") && !hrefs.includes("/financial"));
});

test("Analista exige role admin/analyst além da tela", () => {
  assert.ok(!visibleHrefs(ALL_TELAS, "viewer").includes("/analyst"));
  assert.ok(visibleHrefs(ALL_TELAS, "analyst").includes("/analyst"));
});

test("telas ausentes (sessão carregando/legada) => nada (fail-closed)", () => {
  assert.deepEqual(visibleHrefs(undefined, "admin"), []);
});
