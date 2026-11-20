import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import crm from "../dist-iis/server/server.js";

if (process.env.CRM_ENVIRONMENT !== "Dev") throw new Error("The CRM smoke worker requires CRM_ENVIRONMENT=Dev");
const port = Number(process.env.CRM_PORT ?? "3085");
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Set CRM_PORT to a valid loopback port");

const web = new Hono();
const publicRoot = fileURLToPath(new URL("../dist-iis/client/", import.meta.url));
web.get("/health/live", (context) => context.json({ status: "ok", environment: "Dev", mode: "smoke" }));
web.get("/health/ready", (context) => context.json({ status: "unavailable", reason: "self_hosted_runtime_incomplete" }, 503));
web.get("/assets/*", serveStatic({ root: publicRoot }));
web.get("/brand/*", serveStatic({ root: publicRoot }));
web.get("/login", (context) => crm.fetch(context.req.raw));
web.get("/", (context) => context.redirect("/login"));
web.notFound((context) => context.json({ error: "Not available in the Dev smoke worker" }, 404));

const server = serve({ fetch: web.fetch, port, hostname: "127.0.0.1", overrideGlobalObjects: false }, ({ port: bound }) => {
  console.log("Detent CRM Dev smoke worker listening on loopback port " + bound);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close());
}
