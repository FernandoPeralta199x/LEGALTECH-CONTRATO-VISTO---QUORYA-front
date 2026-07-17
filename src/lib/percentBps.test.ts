import assert from "node:assert/strict";
import test from "node:test";

import { bpsToPercentLabel, parsePercentToBps } from "./percentBps";

test("parsePercentToBps: decimal com vírgula pt-BR", () => {
  assert.equal(parsePercentToBps("12,5"), 1250);
  assert.equal(parsePercentToBps("0,5"), 50);
  assert.equal(parsePercentToBps("0,01"), 1);
});

test("parsePercentToBps: decimal com ponto (hábito internacional) não quebra", () => {
  assert.equal(parsePercentToBps("12.5"), 1250);
  assert.equal(parsePercentToBps("1.25"), 125);
  assert.equal(parsePercentToBps("0.5"), 50);
});

test("parsePercentToBps: ponto-líder sem zero é decimal, não milhar", () => {
  // ".5" deve ser 0,5% (50 bps), não 5% — a regex aceita \d* antes do ponto.
  assert.equal(parsePercentToBps(".5"), 50);
  assert.equal(parsePercentToBps(".25"), 25);
});

test("parsePercentToBps: ponto como separador de milhar pt-BR (o bug)", () => {
  // Antes: Number("1.000") === 1 -> 100 bps. Agora o ponto de milhar é removido.
  assert.equal(parsePercentToBps("1.000"), 100000);
  assert.equal(parsePercentToBps("1.250"), 125000);
  assert.equal(parsePercentToBps("10.000"), 1000000);
  assert.equal(parsePercentToBps("1.000.000"), 100000000);
});

test("parsePercentToBps: milhar + decimal juntos", () => {
  assert.equal(parsePercentToBps("1.000,5"), 100050);
  assert.equal(parsePercentToBps("1.234,56"), 123456);
});

test("parsePercentToBps: inteiros e vazios/ inválidos", () => {
  assert.equal(parsePercentToBps("12"), 1200);
  assert.equal(parsePercentToBps("0"), 0);
  assert.equal(parsePercentToBps(""), null);
  assert.equal(parsePercentToBps("   "), null);
  assert.equal(parsePercentToBps("abc"), null);
  assert.equal(parsePercentToBps("-5"), null); // juros negativo rejeitado
});

test("round-trip bps -> label -> bps é idêntico (inclui >= 1000%, o caso do bug)", () => {
  for (const bps of [0, 1, 50, 199, 1250, 9999, 12345, 99999, 100000, 125000, 1000000]) {
    assert.equal(
      parsePercentToBps(bpsToPercentLabel(bps)),
      bps,
      `round-trip falhou para ${bps} (label="${bpsToPercentLabel(bps)}")`
    );
  }
});
