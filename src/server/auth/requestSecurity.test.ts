import assert from "node:assert/strict";
import test from "node:test";

import {
  RequestSecurityError,
  assertCsrfProtection,
  assertSameOrigin
} from "./requestSecurity";

const APP_ORIGIN = "https://legal.example";

function mutation(headers: HeadersInit = {}): Request {
  return new Request(`${APP_ORIGIN}/api/backend/api/v1/cases`, {
    headers,
    method: "POST"
  });
}

test("same-origin validation accepts only the configured canonical origin", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(
      mutation({ origin: APP_ORIGIN, "sec-fetch-site": "same-origin" }),
      APP_ORIGIN
    )
  );

  for (const origin of ["https://evil.example", "null", ""]) {
    assert.throws(
      () => assertSameOrigin(mutation(origin ? { origin } : {}), APP_ORIGIN),
      (error: unknown) =>
        error instanceof RequestSecurityError && error.status === 403
    );
  }
});

test("CSRF validation requires same-origin plus matching cookie/header tokens", () => {
  const valid = mutation({
    origin: APP_ORIGIN,
    "sec-fetch-site": "same-origin",
    "x-csrf-token": "csrf-token-123"
  });
  assert.doesNotThrow(() =>
    assertCsrfProtection(valid, "csrf-token-123", APP_ORIGIN)
  );

  const missingHeader = mutation({
    origin: APP_ORIGIN,
    "sec-fetch-site": "same-origin"
  });
  assert.throws(
    () => assertCsrfProtection(missingHeader, "csrf-token-123", APP_ORIGIN),
    RequestSecurityError
  );

  const mismatch = mutation({
    origin: APP_ORIGIN,
    "sec-fetch-site": "same-origin",
    "x-csrf-token": "attacker-token"
  });
  assert.throws(
    () => assertCsrfProtection(mismatch, "csrf-token-123", APP_ORIGIN),
    RequestSecurityError
  );
});
