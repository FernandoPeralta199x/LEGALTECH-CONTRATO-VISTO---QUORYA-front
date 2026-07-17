import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_REDIRECT, sanitizeNextPath } from "./safeRedirect";

test("A6: caminho interno válido é preservado", () => {
  assert.equal(sanitizeNextPath("/cases"), "/cases");
  assert.equal(sanitizeNextPath("/cases/123?tab=triagem"), "/cases/123?tab=triagem");
  assert.equal(sanitizeNextPath("/"), "/");
});

test("A6: ausência de next -> destino padrão", () => {
  assert.equal(sanitizeNextPath(null), DEFAULT_REDIRECT);
  assert.equal(sanitizeNextPath(undefined), DEFAULT_REDIRECT);
  assert.equal(sanitizeNextPath(""), DEFAULT_REDIRECT);
});

test("A6: open redirect protocol-relative é bloqueado", () => {
  assert.equal(sanitizeNextPath("//evil.com"), DEFAULT_REDIRECT);
  assert.equal(sanitizeNextPath("//evil.com/path"), DEFAULT_REDIRECT);
  assert.equal(sanitizeNextPath("/\\evil.com"), DEFAULT_REDIRECT);
});

test("A6: URL absoluta / esquema é bloqueada", () => {
  assert.equal(sanitizeNextPath("https://evil.com"), DEFAULT_REDIRECT);
  assert.equal(sanitizeNextPath("http://evil.com"), DEFAULT_REDIRECT);
  assert.equal(sanitizeNextPath("javascript:alert(1)"), DEFAULT_REDIRECT);
  assert.equal(sanitizeNextPath("evil.com"), DEFAULT_REDIRECT);
});

test("A6: backslash e caracteres de controle são bloqueados", () => {
  assert.equal(sanitizeNextPath("/dashboard\\@evil.com"), DEFAULT_REDIRECT);
  assert.equal(sanitizeNextPath("/dash\tboard"), DEFAULT_REDIRECT);
  assert.equal(sanitizeNextPath("/dash\nboard"), DEFAULT_REDIRECT);
});
