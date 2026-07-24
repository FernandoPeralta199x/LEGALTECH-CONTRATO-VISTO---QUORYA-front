import assert from "node:assert/strict";
import test from "node:test";

import { formatCountdown } from "./pixFormat";

test("formatCountdown formata como m:ss com zero-pad nos segundos", () => {
  assert.equal(formatCountdown(15 * 60 * 1000), "15:00");
  assert.equal(formatCountdown(90 * 1000), "1:30");
  assert.equal(formatCountdown(5 * 1000), "0:05");
  assert.equal(formatCountdown(65 * 1000), "1:05");
  assert.equal(formatCountdown(600), "0:00"); // sub-segundo (>0) ainda mostra 0:00
});

test("formatCountdown trata <= 0 e inválidos como expirado", () => {
  assert.equal(formatCountdown(0), "expirado");
  assert.equal(formatCountdown(-1000), "expirado");
  assert.equal(formatCountdown(Number.NaN), "expirado");
  assert.equal(formatCountdown(Number.POSITIVE_INFINITY), "expirado");
});
