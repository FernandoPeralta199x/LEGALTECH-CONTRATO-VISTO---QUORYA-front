// src/services/payment/tokenize.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenizeCard, luhnValid, cardBrand } from "./tokenize";

test("luhn valida número correto e rejeita errado", () => {
  assert.equal(luhnValid("4242424242424242"), true);
  assert.equal(luhnValid("4242424242424241"), false);
});

test("cardBrand detecta bandeira pelo BIN", () => {
  assert.equal(cardBrand("4242424242424242"), "visa");
  assert.equal(cardBrand("5555555555554444"), "mastercard");
});

test("tokenizeCard mock devolve token+last4+brand e NÃO expõe os crus", async () => {
  const r = await tokenizeCard({
    number: "4242 4242 4242 4242", exp: "12/30", cvv: "123",
    holder: "Fulano", cpf: "060.380.601-54"
  });
  assert.match(r.token, /^tok_mock_/);
  assert.equal(r.last4, "4242");
  assert.equal(r.brand, "visa");
  const blob = JSON.stringify(r);
  assert.ok(!blob.includes("4242424242424242") && !blob.includes("123"));
});

test("tokenizeCard rejeita número inválido", async () => {
  await assert.rejects(() => tokenizeCard({
    number: "1234 5678 9012 3456", exp: "12/30", cvv: "123", holder: "X", cpf: "060.380.601-54"
  }));
});
