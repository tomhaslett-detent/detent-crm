import { isDetentStaff } from "@/lib/crm-staff";
import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-middleware";
import { mapping, portalId, summarizePage } from "@/lib/hubspot-mapping";

async function request(token, path, query = {}) {
  const url = new URL(path, "https://api.hubapi.com");
  url.search = new URLSearchParams(query).toString();
  try {
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { status: response.status };
    return { status: response.status, data: await response.json() };
  } catch {
    return { status: "request_failed" };
  }
}

export const previewHubSpot = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (!isDetentStaff(context.user)) throw new Error("Detent staff access required");
    let token;
    try {
      const connection = await context.getBase44().asServiceRole.connectors.getConnection("hubspot");
      token = connection.accessToken;
    } catch {
      return { status: "connector_unavailable" };
    }
    if (!token) return { status: "connector_unavailable" };
    const account = await request(token, "/account-info/v3/details");
    if (!account.data) return { status: "portal_unverified", accountCheck: account.status };
    if (String(account.data.portalId) !== portalId) return { status: "wrong_portal" };

    const associationTypes = { companies: "contacts,deals", contacts: "companies,deals", deals: "companies,contacts" };
    const jobs = Object.entries(mapping).flatMap(([object, config]) => [
      [object, "/crm/v3/objects/" + object, {
        limit: "100",
        properties: [...Object.keys(config.fields), "hubspot_owner_id", ...(object === "deals" ? ["pipeline", "dealstage"] : [])].join(","),
        associations: associationTypes[object],
      }, (body) => summarizePage(object, body)],
      [object + "_properties", "/crm/v3/properties/" + object, {}, (body) => ({
        definitions: body.results?.length ?? 0,
        unmappedDefinitions: body.results?.filter((field) => !Object.hasOwn(config.fields, field.name)).length ?? 0,
      })],
    ]);
    for (const object of ["emails", "notes", "calls", "meetings", "tasks"]) {
      jobs.push([object, "/crm/v3/objects/" + object, { limit: "1" }, (body) => ({
        sampled: body.results?.length ?? 0,
        hasMore: Boolean(body.paging?.next),
      })]);
    }
    jobs.push(
      ["file_search", "/files/v3/files/search", { limit: "1" }, (body) => ({
        sampled: body.results?.length ?? 0,
        hasMore: Boolean(body.paging?.next),
      })],
      ["subscription_definitions", "/communication-preferences/v3/definitions", {}, (body) => ({
        definitions: body.subscriptionDefinitions?.length ?? 0,
      })],
      ["owners", "/crm/v3/owners", { limit: "100" }, (body) => ({ sampled: body.results?.length ?? 0, hasMore: Boolean(body.paging?.next) })],
      ["deal_pipelines", "/crm/v3/pipelines/deals", {}, (body) => ({
        pipelines: body.results?.length ?? 0,
        stages: body.results?.reduce((count, pipeline) => count + (pipeline.stages?.length ?? 0), 0) ?? 0,
      })],
    );
    const checks = await Promise.all(jobs.map(async ([name, path, query, summarize]) => {
      const result = await request(token, path, query);
      return [name, { status: result.status, ...(result.data ? summarize(result.data) : {}) }];
    }));
    return { status: "sampled", portalId, checks: Object.fromEntries(checks), destinationWrites: 0 };
  });
