import assert from "node:assert/strict";
import test from "node:test";
import { createIisApp } from "../server/iis-app.js";
import { hashCrmPassword, verifyCrmPassword } from "../server/sql-auth.js";
import { iisEnvironment } from "../server/iis-environment.js";

test("IIS separates Dev and Live origins, ports and readiness reporting", async () => {
  const dev = iisEnvironment({ CRM_ENVIRONMENT: "Dev" });
  assert.throws(() => iisEnvironment({ CRM_ENVIRONMENT: "Live" }), /verifying Dev/);
  const live = iisEnvironment({ CRM_ENVIRONMENT: "Live", CRM_LIVE_ENABLED: "true" });
  assert.notEqual(dev.port, live.port);
  assert.throws(() => iisEnvironment({ CRM_ENVIRONMENT: "Dev", CRM_PORT: String(live.port) }), /reserved/);
  assert.throws(() => iisEnvironment({ CRM_ENVIRONMENT: "Dev", CRM_PUBLIC_ORIGIN: live.origin }), /HTTPS origin/);
  for (const settings of [dev, live]) {
    const app = createIisApp({ ...settings, ready: () => true });
    const response = await app.request(settings.origin + "/health/ready");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", database: "Detent-CRM-" + settings.environment });
  }
});

test("CRM password hashes use a fresh salt and reject wrong credentials", async () => {
  const password = "synthetic-password-only";
  const hash = await hashCrmPassword(password);
  assert.notEqual(hash, await hashCrmPassword(password));
  assert.equal(await verifyCrmPassword(password, hash), true);
  assert.equal(await verifyCrmPassword("different-password", hash), false);
});

test("Dev HTTP sign-in requires a matching origin and creates a secure session", async () => {
  const origin = "https://crm-dev.example";
  const token = "x".repeat(43);
  const user = { id: "fixture", role: "admin" };
  let signedOut = false;
  const auth = {
    authenticate: async (email, password) => email === "fixture@example.test" && password === "fixture"
      ? { status: "ok", token } : { status: "invalid" },
    userFor: async (cookie) => !signedOut && cookie === "__Host-detent-crm=" + token ? user : null,
    signOut: async () => { signedOut = true; },
  };
  const app = createIisApp({
    origin, auth, entities: {}, ready: () => true,
    handler: (_request, { context }) => globalThis.Response.json(context.crmRuntime.user),
  });
  const request = (path, options) => app.request(origin + path, options);
  assert.equal((await request("/api/auth/me")).status, 401);
  const login = (requestedOrigin, password) => request("/api/auth/login", {
    method: "POST", headers: { Origin: requestedOrigin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "fixture@example.test", password }),
  });
  assert.equal((await login("https://different.example", "fixture")).status, 403);
  assert.equal((await login(origin, "wrong")).status, 401);
  const accepted = await login(origin, "fixture");
  assert.equal(accepted.status, 200);
  const setCookie = accepted.headers.get("Set-Cookie");
  assert.match(setCookie, /Path=\/; HttpOnly; Secure; SameSite=Lax/);
  const headers = { Cookie: setCookie.split(";")[0], Origin: origin };
  assert.deepEqual(await (await request("/api/auth/me", { headers })).json(), user);
  assert.deepEqual(await (await request("/accounts", { headers })).json(), user);
  assert.equal((await request("/api/auth/logout", { method: "POST", headers })).status, 200);
  assert.equal((await request("/api/auth/me", { headers })).status, 401);
});
