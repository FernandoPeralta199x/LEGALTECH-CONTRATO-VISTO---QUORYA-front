import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as proxyPostRoute } from "@/app/api/backend/[...path]/route";
import { sealSessionCookie } from "@/server/auth/sessionCookie";

const SECRET = "route-test-secret-with-at-least-32-characters";
const ORIGIN = "http://frontend.test";

function configureBff(): () => void {
  const previous = {
    API_BASE_URL: process.env.API_BASE_URL,
    APP_ORIGIN: process.env.APP_ORIGIN,
    AUTH_COOKIE_SECRET: process.env.AUTH_COOKIE_SECRET
  };
  process.env.API_BASE_URL = "http://backend.test";
  process.env.APP_ORIGIN = ORIGIN;
  process.env.AUTH_COOKIE_SECRET = SECRET;
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        Reflect.deleteProperty(process.env, key);
      } else {
        process.env[key] = value;
      }
    }
  };
}

test("login sela o JWT em cookie HttpOnly e não o devolve ao browser", async () => {
  const restore = configureBff();
  const rawToken = "backend.header.payload.signature";
  const requested: string[] = [];

  globalThis.fetch = (async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.endsWith("/auth/login")) {
      return Response.json({
        data: { access_token: rawToken, expires_in: 900 },
        success: true
      });
    }
    if (url.endsWith("/me")) {
      return Response.json({
        data: {
          email: "admin@example.test",
          id: "user-1",
          name: "Admin",
          organization_id: "org-1",
          role: "admin"
        },
        success: true
      });
    }
    throw new Error(`URL inesperada: ${url}`);
  }) as typeof fetch;

  try {
    const request = new NextRequest(`${ORIGIN}/api/auth/login`, {
      body: JSON.stringify({
        email: "admin@example.test",
        password: "Senha-forte-123!"
      }),
      headers: {
        "Content-Type": "application/json",
        Origin: ORIGIN,
        "Sec-Fetch-Site": "same-origin"
      },
      method: "POST"
    });
    const response = await loginRoute(request);
    const body = await response.text();
    const setCookie = response.headers.get("set-cookie") ?? "";

    assert.equal(response.status, 200);
    assert.equal(body.includes(rawToken), false);
    assert.equal(setCookie.includes(rawToken), false);
    assert.match(setCookie, /quorya_session=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=lax/i);
    assert.deepEqual(requested.length, 2);
  } finally {
    restore();
  }
});

test("proxy valida CSRF e injeta Authorization somente no servidor", async () => {
  const restore = configureBff();
  const rawToken = "backend.header.payload.signature";
  const csrf = "csrf-token-with-sufficient-length";
  const now = Date.now();
  const sealed = sealSessionCookie(
    { expiresAt: now + 60_000, issuedAt: now, token: rawToken },
    SECRET
  );
  let authorization = "";
  let upstreamUrl = "";

  globalThis.fetch = (async (input, init) => {
    upstreamUrl = String(input);
    authorization = new Headers(init?.headers).get("Authorization") ?? "";
    return Response.json({ data: { id: "case-1" }, success: true });
  }) as typeof fetch;

  try {
    const request = new NextRequest(
      `${ORIGIN}/api/backend/api/v1/cases?source=real`,
      {
        body: JSON.stringify({ title: "Contrato" }),
        headers: {
          "Content-Type": "application/json",
          Cookie: `quorya_session=${sealed}; quorya_csrf=${csrf}`,
          Origin: ORIGIN,
          "Sec-Fetch-Site": "same-origin",
          "X-CSRF-Token": csrf
        },
        method: "POST"
      }
    );
    const response = await proxyPostRoute(request, {
      params: Promise.resolve({ path: ["api", "v1", "cases"] })
    });

    assert.equal(response.status, 200);
    assert.equal(authorization, `Bearer ${rawToken}`);
    assert.equal(
      upstreamUrl,
      "http://backend.test/cases?source=real"
    );
  } finally {
    restore();
  }
});

test("proxy rejeita mutação sem double-submit CSRF antes de chamar o backend", async () => {
  const restore = configureBff();
  const now = Date.now();
  const sealed = sealSessionCookie(
    {
      expiresAt: now + 60_000,
      issuedAt: now,
      token: "backend.header.payload.signature"
    },
    SECRET
  );
  let upstreamCalled = false;
  globalThis.fetch = (async () => {
    upstreamCalled = true;
    return Response.json({});
  }) as typeof fetch;

  try {
    const request = new NextRequest(`${ORIGIN}/api/backend/api/v1/cases`, {
      body: "{}",
      headers: {
        "Content-Type": "application/json",
        Cookie: `quorya_session=${sealed}`,
        Origin: ORIGIN,
        "Sec-Fetch-Site": "same-origin"
      },
      method: "POST"
    });
    const response = await proxyPostRoute(request, {
      params: Promise.resolve({ path: ["api", "v1", "cases"] })
    });

    assert.equal(response.status, 403);
    assert.equal(upstreamCalled, false);
  } finally {
    restore();
  }
});
