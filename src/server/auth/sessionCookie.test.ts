import assert from "node:assert/strict";
import test from "node:test";

import {
  csrfCookieOptions,
  sealSessionCookie,
  sessionCookieOptions,
  unsealSessionCookie
} from "./sessionCookie";

const SECRET = "test-secret-with-at-least-32-characters-long";
const TOKEN = "header.payload.signature";

test("session cookie seals the backend token and round-trips before expiration", () => {
  const now = Date.parse("2026-07-23T12:00:00.000Z");
  const expiresAt = now + 60_000;
  const sealed = sealSessionCookie(
    { expiresAt, issuedAt: now, token: TOKEN },
    SECRET
  );

  assert.equal(sealed.includes(TOKEN), false);
  assert.deepEqual(unsealSessionCookie(sealed, SECRET, now), {
    expiresAt,
    issuedAt: now,
    token: TOKEN
  });
});

test("session cookie rejects tampering and expiration", () => {
  const now = Date.parse("2026-07-23T12:00:00.000Z");
  const sealed = sealSessionCookie(
    { expiresAt: now + 60_000, issuedAt: now, token: TOKEN },
    SECRET
  );
  const replacement = sealed.endsWith("a") ? "b" : "a";
  const tampered = `${sealed.slice(0, -1)}${replacement}`;

  assert.equal(unsealSessionCookie(tampered, SECRET, now), null);
  assert.equal(unsealSessionCookie(sealed, SECRET, now + 60_001), null);
});

test("session and CSRF cookies use production-safe flags", () => {
  assert.deepEqual(sessionCookieOptions(900, true), {
    httpOnly: true,
    maxAge: 900,
    path: "/",
    sameSite: "lax",
    secure: true
  });
  assert.deepEqual(csrfCookieOptions(true), {
    httpOnly: false,
    path: "/",
    sameSite: "strict",
    secure: true
  });
});
