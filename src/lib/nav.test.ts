import assert from "node:assert/strict";
import test from "node:test";

import type { SessionPerfil } from "@/types/auth";

import { visibleNavGroups } from "./nav";

function visibleHrefs(
  role: string | undefined,
  perfil: SessionPerfil | undefined
): string[] {
  return visibleNavGroups(role, perfil)
    .flatMap((group) => group.items.map((item) => item.href))
    .sort();
}

test("administrador enxerga todas as telas", () => {
  const hrefs = visibleHrefs("admin", "administrador");
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
    assert.ok(hrefs.includes(href), `administrador deveria ver ${href}`);
  }
});

test("empresarial não vê Analista, Clientes, Administração nem Financeiro", () => {
  // role=admin é o pior caso p/ vazamento: mesmo assim o perfil deve esconder.
  const hrefs = visibleHrefs("admin", "empresarial");
  assert.deepEqual(hrefs, [
    "/cases",
    "/cases/new",
    "/dashboard",
    "/documents",
    "/reports",
    "/settings"
  ]);
});

test("cliente_comum só vê Novo Pedido, Casos, Relatórios e Configurações", () => {
  const hrefs = visibleHrefs("admin", "cliente_comum");
  assert.deepEqual(hrefs, ["/cases", "/cases/new", "/reports", "/settings"]);
});

test("perfil ausente esconde as telas perfil-restritas (fail-closed)", () => {
  const hrefs = visibleHrefs("admin", undefined);
  for (const restrito of [
    "/admin",
    "/financial",
    "/dashboard",
    "/documents",
    "/analyst",
    "/clients"
  ]) {
    assert.ok(!hrefs.includes(restrito), `perfil ausente não deveria ver ${restrito}`);
  }
});
