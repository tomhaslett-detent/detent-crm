import { serve } from "@hono/node-server";
import sql from "mssql";
import crm from "../dist-iis/server/server.js";
import { connectCrmSql } from "./sql-runtime.js";
import { createIisApp } from "./iis-app.js";
import { iisEnvironment } from "./iis-environment.js";

const settings = iisEnvironment();
const runtime = await connectCrmSql(sql);
const app = createIisApp({
  ...settings,
  ...runtime,
  handler: crm.fetch,
  ready: () => runtime.entities.CrmSettings.count({}).then(() => true, () => false),
});
const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: settings.port, overrideGlobalObjects: false }, () =>
  console.log("Detent CRM " + settings.environment + " worker listening on loopback port " + settings.port));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => { void runtime.close(); }));
}
