import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { crmSessionCookie } from "./sql-auth.js";

export function createIisApp({ origin, environment, database, auth, entities, handler, ready }) {
  const web = new Hono();
  const publicRoot = fileURLToPath(new URL("../dist-iis/client/", import.meta.url));
  web.get("/assets/*", serveStatic({ root: publicRoot }));
  web.get("/brand/*", serveStatic({ root: publicRoot }));
  web.use("*", async (context, next) => {
    context.header("Cache-Control", "no-store");
    context.header("X-Content-Type-Options", "nosniff");
    if (context.req.method !== "GET" && context.req.method !== "HEAD" && context.req.header("Origin") !== origin) {
      return context.json({ error: "Request origin rejected" }, 403);
    }
    await next();
  });
  web.get("/health/live", (context) => context.json({ status: "ok", environment }));
  web.get("/health/ready", async (context) => {
    if (!await ready()) return context.json({ status: "unavailable" }, 503);
    return context.json({ status: "ok", database });
  });
  web.get("/api/auth/me", async (context) => {
    const user = await auth.userFor(context.req.header("Cookie"));
    return user ? context.json(user) : context.json({ error: "Unauthorized" }, 401);
  });
  web.post("/api/auth/login", bodyLimit({ maxSize: 4096 }), async (context) => {
    if (!/^application\/json(?:;|$)/i.test(context.req.header("Content-Type") ?? "")) {
      return context.json({ error: "Expected JSON" }, 415);
    }
    const data = await context.req.json().catch(() => null);
    const result = await auth.authenticate(data?.email, data?.password);
    if (result.status === "busy") return context.json({ error: "Try again shortly" }, 429);
    if (result.status !== "ok") return context.json({ error: "Invalid credentials" }, 401);
    context.header("Set-Cookie", crmSessionCookie(result.token));
    return context.json({ ok: true });
  });
  web.post("/api/auth/logout", async (context) => {
    await auth.signOut(context.req.header("Cookie"));
    context.header("Set-Cookie", crmSessionCookie());
    return context.json({ ok: true });
  });
  web.all("/api/*", (context) => context.json({ error: "Not found" }, 404));
  for (const path of ["/register", "/forgot-password", "/reset-password", "/mfa"]) {
    web.get(path, (context) => context.redirect("/login"));
  }
  web.all("*", async (context) => {
    const user = await auth.userFor(context.req.header("Cookie"));
    const unavailable = () => { throw new Error("This integration is unavailable in the self-hosted CRM"); };
    const client = {
      entities,
      asServiceRole: {
        entities,
        connectors: { getConnection: unavailable },
        integrations: { Core: { UploadPrivateFile: unavailable, CreateFileSignedUrl: unavailable } },
      },
      users: { inviteUser: unavailable },
    };
    return handler(context.req.raw, { context: { crmRuntime: { user, client } } });
  });
  web.onError((_error, context) => context.json({ error: "Detent CRM is temporarily unavailable" }, 503));
  return web;
}
