import assert from "node:assert/strict";
import test from "node:test";

import {
  productLabel,
  reportStatusLabel,
  sourceModeLabel
} from "./reportLabels";

test("sourceModeLabel traduz as chaves conhecidas para PT", () => {
  assert.equal(sourceModeLabel("hybrid"), "híbrido");
  assert.equal(sourceModeLabel("local"), "local");
  assert.equal(sourceModeLabel("mock"), "mock");
  assert.equal(sourceModeLabel("real"), "real");
  assert.equal(sourceModeLabel("simulated"), "simulado");
});

test("sourceModeLabel usa \"api\" como default para vazio/não-string", () => {
  assert.equal(sourceModeLabel(""), "api");
  assert.equal(sourceModeLabel(undefined), "api");
  assert.equal(sourceModeLabel(null), "api");
  assert.equal(sourceModeLabel(42), "api");
});

test("sourceModeLabel devolve o valor bruto quando não mapeado", () => {
  assert.equal(sourceModeLabel("api"), "api");
  assert.equal(sourceModeLabel("desconhecido"), "desconhecido");
});

test("productLabel resolve alias legado e cai no valor bruto quando não mapeado", () => {
  // contract_analysis é alias de analise_contratual (mesmo produto do catálogo)
  assert.equal(productLabel("contract_analysis"), productLabel("analise_contratual"));
  assert.equal(productLabel(""), "Não informado");
  assert.equal(productLabel("valor_inexistente"), "valor_inexistente");
});

test("reportStatusLabel canônico usa \"Não gerado\" para relatório ausente", () => {
  assert.equal(reportStatusLabel(null), "Não gerado");
  assert.equal(reportStatusLabel({ status: "ready" }), "Pronto");
  assert.equal(reportStatusLabel({ status: "not_started" }), "Não iniciado");
});
