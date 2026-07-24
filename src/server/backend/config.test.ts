import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBackendUrl,
  resolveBackendBaseUrl
} from "./config";

test("production backend config is server-only HTTPS and preserves a stage prefix", () => {
  const base = resolveBackendBaseUrl(
    { API_BASE_URL: "https://api.example.execute-api.sa-east-1.amazonaws.com/staging" },
    true
  );

  assert.equal(
    buildBackendUrl(base, "/api/v1/cases", "?page=2"),
    "https://api.example.execute-api.sa-east-1.amazonaws.com/staging/api/v1/cases?page=2"
  );
});

test("production backend config fails closed for missing or insecure URLs", () => {
  assert.throws(
    () => resolveBackendBaseUrl({}, true),
    /API_BASE_URL/
  );
  assert.throws(
    () => resolveBackendBaseUrl({ API_BASE_URL: "http://api.example" }, true),
    /HTTPS/
  );
  assert.throws(
    () =>
      resolveBackendBaseUrl(
        { API_BASE_URL: "https://user:password@api.example" },
        true
      ),
    /credenciais/
  );
});

test("backend URL builder rejects traversal and encoded path separators", () => {
  const base = new URL("https://api.example/staging/");

  assert.throws(
    () => buildBackendUrl(base, "/api/v1/../admin"),
    /não permitido/
  );
  assert.throws(
    () => buildBackendUrl(base, "/api/v1/cases/%2Fadmin"),
    /não permitido/
  );
  assert.throws(
    () => buildBackendUrl(base, "https://evil.example/api/v1/cases"),
    /não permitido/
  );
});
