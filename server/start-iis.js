import { serve } from "@hono/node-server";
import sql from "mssql";
import crm from "../dist-iis/server/server.js";
import { connectCrmSql } from "./sql-runtime.js";
import { createIisApp } from "./iis-app.js";

if (process.env.CRM_ENVIRONMENT !== "Dev") throw new Error("Only the CRM Dev worker is enabled");
const port = Number(process.env.CRM_PORT ?? "3085");
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Set CRM_PORT to a valid loopback port");
const origin = new URL(process.env.CRM_PUBLIC_ORIGIN ?? "https://crm-dev.mialab.co.uk");
if (origin.protocol !== "https:" || origin.href !== origin.origin + "/") throw new Error("CRM_PUBLIC_ORIGIN must be an HTTPS origin");
const runtime = await connectCrmSql(sql);
const app = createIisApp({
  origin: origin.origin,
  ...runtime,
  handler: crm.fetch,
  ready: () => runtime.entities.CrmSettings.count({}).then(() => true, () => false),
});
const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port, overrideGlobalObjects: false }, () =>
  console.log("Detent CRM Dev worker listening on loopback port " + port));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => { void runtime.close(); }));
}
