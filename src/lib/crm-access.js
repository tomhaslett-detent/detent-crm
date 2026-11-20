import { ACTIVITY_TYPES } from "@/lib/crm";
import { linkedIds, linkedView } from "@/lib/crm-linked-view";
import { crmSearchFilter } from "@/lib/crm-search";
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { mayAccess, roles } from "@/lib/crm-policy";

const fields = {
  Account: "name domain industry employees region health owner arr website notes last_touch",
  Contact: "first_name last_name email phone title account_id account_name role owner last_engaged",
  Deal: "title account_id account_name contact_id contact_name value currency stage source owner close_date probability next_step last_activity_date lost_reason",
  Activity: "type subject body deal_id deal_name account_id account_name contact_id contact_name occurred_at owner",
};
const links = { account: ["Account", "name"], contact: ["Contact", "first_name"], deal: ["Deal", "title"] };
function unscoped(actor) {
  return actor.role === "admin" || actor.role === "revops";
}

async function crmViews(records, actor, entities) {
  if (unscoped(actor)) return records.map((record) => linkedView(record));
  const visible = Object.fromEntries(await Promise.all(linkedIds(records).map(async ([object, ids]) => {
    const allowed = new Set();
    for (let start = 0; start < ids.length; start += 100) {
      const chunk = ids.slice(start, start + 100);
      const rows = asRows(await entities[object].filter({ id: { $in: chunk } }, "id", 100, 0, ["id", "team_key", "owner_email"]));
      for (const row of rows) if (mayAccess(actor, "read", object, row)) allowed.add(row.id);
    }
    return [object, allowed];
  })));
  return records.map((record) => linkedView(record, visible));
}
const asRows = (value) => Array.isArray(value) ? value : value?.items ?? [];
function deny(message = "CRM access denied") {
  setResponseStatus(403);
  throw new Error(message);
}

export async function actorFor(context) {
  const email = context.user.email?.trim().toLowerCase();
  if (context.user.role === "admin") return { role: "admin", email };
  if (!email) return null;
  const records = asRows(await context.getBase44().asServiceRole.entities.TeamInvite.filter({ email }, "-created_date", 2));
  const [membership] = records;
  if (records.length !== 1 || membership.status !== "active" || !roles.includes(membership.crm_role) || !membership.crm_team) return null;
  return { role: membership.crm_role, email, team: membership.crm_team };
}

export const getCrmActor = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(({ context }) => actorFor(context));

const request = z.object({
  object: z.enum(["Account", "Contact", "Deal", "Activity"]),
  action: z.enum(["list", "page", "get", "count", "create", "update", "delete"]),
  search: z.string().max(100).optional(),
  cursor: z.string().min(1).max(2000).optional(),
  activityType: z.enum(ACTIVITY_TYPES.map(({ value }) => value)).optional(),
  id: z.string().min(1).max(100).optional(),
  sort: z.string().regex(/^-?[a-z_]+$/).optional(),
  limit: z.number().int().min(1).max(500).optional(),
  skip: z.number().int().min(0).optional(),
  filter: z.record(z.string(), z.string().max(100)).optional(),
  values: z.record(z.string(), z.union([z.string().max(20000), z.number().finite(), z.boolean(), z.null()])).optional(),
});

export const crmRequest = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(request)
  .handler(async ({ context, data }) => {
    const actor = await actorFor(context);
    if (!actor) deny("Ask a CRM admin to enable your work email.");
    const { object, action, id, sort, limit = 100, skip = 0 } = data;
    const entities = context.getBase44().asServiceRole.entities;
    const entity = entities[object];
    const query = Object.fromEntries(Object.entries(data.filter ?? {}).filter(([key]) => /^(account|contact|deal)_id$/.test(key)));
    if (!unscoped(actor)) {
      for (const [key, linkedId] of Object.entries(query)) {
        const [target] = links[key.slice(0, -3)];
        const record = await entities[target].get(linkedId);
        if (!record || !mayAccess(actor, "read", target, record)) deny("Related record is outside your access.");
      }
    }
    if (object === "Contact" && query.account_id) {
      const accountId = query.account_id;
      delete query.account_id;
      query.$or = [{ account_id: accountId }, { hubspot_account_ids: { $all: [accountId] } }];
    }
    if (object === "Deal") {
      const references = ["account_id", "contact_id"].filter((field) => query[field]);
      if (references.length) query.$and = references.map((field) => {
        const id = query[field];
        delete query[field];
        return { $or: [{ [field]: id }, { ["hubspot_" + field + "s"]: { $all: [id] } }] };
      });
    }
    if (object === "Activity") {
      const related = Object.entries(query);
      for (const [key] of related) delete query[key];
      if (related.length) query.$and = related.map(([key, id]) => ({
        $or: [{ [key]: id }, { [key + "s"]: { $all: [id] } }],
      }));
    }
    if (actor.role !== "admin" && actor.role !== "revops") query.team_key = actor.team;
    if (actor.role === "rep") query.owner_email = actor.email;
    if (action === "page" && object === "Activity") {
      if (data.activityType) query.type = data.activityType;
      const [page, total] = await Promise.all([
        entity.filter(query, { sort: "-occurred_at", limit: Math.min(limit, 100), cursor: data.cursor }),
        entity.count(query),
      ]);
      const records = await crmViews(asRows(page), actor, entities);
      return { records, total, nextCursor: page.next_cursor ?? null };
    }
    if (action === "page") {
      const searchFilter = crmSearchFilter(object, data.search, unscoped(actor), actor.role === "admin");
      const scopedSearch = Object.keys(searchFilter).length ? { $and: [query, searchFilter] } : query;
      const pageQuery = data.cursor ? { $and: [scopedSearch, { id: { $gt: data.cursor } }] } : scopedSearch;
      const pageLimit = Math.min(limit, 100);
      const [response, total] = await Promise.all([
        entity.filter(pageQuery, "id", pageLimit + 1),
        entity.count(scopedSearch),
      ]);
      const rows = asRows(response);
      const records = await crmViews(rows.slice(0, pageLimit), actor, entities);
      return { records, total, nextCursor: rows.length > pageLimit ? records.at(-1).id : null };
    }
    if (action === "list") return crmViews(asRows(await entity.filter(query, sort || "-created_date", limit, skip)), actor, entities);
    if (action === "count") return entity.count(query);
    if (action !== "create" && !id) deny();
    const current = action === "create" ? null : await entity.get(id);
    if (current && !mayAccess(actor, "read", object, current)) deny();
    if (action === "get") return (await crmViews([current], actor, entities))[0];
    const scoped = current || { team_key: actor.team || "", owner_email: actor.email };
    if (!current && (actor.role === "admin" || actor.role === "revops") && data.values?.owner?.includes?.("@")) {
      const email = data.values.owner.trim().toLowerCase();
      const members = asRows(await entities.TeamInvite.filter({ email }, "-created_date", 2));
      if (members.length !== 1 || members[0].status !== "active" || !members[0].crm_team) deny("Choose an active member’s work email.");
      scoped.team_key = members[0].crm_team;
      scoped.owner_email = email;
    }
    if (!current && object === "Activity") {
      for (const [prefix, [target]] of Object.entries(links).reverse()) {
        const linkedId = data.values?.[prefix + "_id"];
        if (!linkedId) continue;
        const linked = await entities[target].get(linkedId);
        if (!mayAccess(actor, "read", target, linked)) deny("Related record is outside your access.");
        scoped.team_key = linked.team_key || "";
        scoped.owner_email = linked.owner_email || actor.email;
        break;
      }
    }
    if (!mayAccess(actor, action, object, scoped)) deny();
    if (action === "delete") return entity.delete(id);

    const allowed = fields[object].split(" ");
    const values = Object.fromEntries(Object.entries(data.values ?? {}).filter(([key]) => allowed.includes(key)));
    if (action === "create") {
      values.owner_email = scoped.owner_email;
      values.team_key = scoped.team_key;
    }
    if (Object.hasOwn(values, "owner")) values.owner = scoped.owner_email || "";
    for (const [prefix, [target, label]] of Object.entries(links)) {
      const key = prefix + "_id";
      const name = prefix + "_name";
      delete values[name];
      if (!Object.hasOwn(values, key)) continue;
      if (current?.[key] && !unscoped(actor)) {
        const oldLink = await entities[target].get(current[key]).catch((error) => {
          if ((error?.response?.status ?? error?.status) === 404) return null;
          throw error;
        });
        if (!oldLink || !mayAccess(actor, "read", target, oldLink)) {
          if (values[key]) deny("Only a CRM administrator can change this protected relationship.");
          delete values[key];
          continue;
        }
      }
      if (!values[key]) {
        values[key] = "";
        values[name] = "";
        continue;
      }
      const linked = await entities[target].get(values[key]);
      if (!mayAccess(actor, "read", target, linked)) deny("Related record is outside your access.");
      if (scoped.team_key && (linked.team_key !== scoped.team_key || linked.owner_email !== scoped.owner_email)) {
        deny("Related records must share an owner and team.");
      }
      values[name] = prefix === "contact" ? [linked.first_name, linked.last_name].filter(Boolean).join(" ") : linked[label] || "";
    }
    const stored = await (current ? entity.update(id, values) : entity.create(values));
    return (await crmViews([stored], actor, entities))[0];
  });

export const getDealAssociations = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string().min(1).max(100) }))
  .handler(async ({ context, data }) => {
    const actor = await actorFor(context);
    if (!actor) deny();
    const entities = context.getBase44().asServiceRole.entities;
    const deal = await entities.Deal.get(data.id);
    if (!deal || !mayAccess(actor, "read", "Deal", deal)) deny();

    const entries = await Promise.all(linkedIds([deal])
      .filter(([object]) => object === "Account" || object === "Contact")
      .map(async ([object, ids]) => {
        const records = [];
        for (let offset = 0; offset < ids.length; offset += 100) {
          const chunk = ids.slice(offset, offset + 100);
          const page = asRows(await entities[object].filter({ id: { $in: chunk } }, "id", 100));
          for (const row of page) {
            if (!mayAccess(actor, "read", object, row)) continue;
            const label = object === "Account" ? row.name : [row.first_name, row.last_name].filter(Boolean).join(" ");
            const primary = row.id === (object === "Account" ? deal.account_id : deal.contact_id);
            records.push({ id: row.id, label: label || "Unnamed record", primary });
          }
        }
        return [object, records.sort((left, right) => Number(right.primary) - Number(left.primary) || left.label.localeCompare(right.label))];
      }));
    return Object.fromEntries(entries);
  });

export const exportScopedCrm = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const actor = await actorFor(context);
    if (!mayAccess(actor, "export")) deny();
    const entities = context.getBase44().asServiceRole.entities;
    const entries = await Promise.all(Object.keys(fields).map(async (object) => {
      const records = [];
      const entity = entities[object];
      const pageSize = 250;
      const expectedCount = await entity.count({});
      let cursor;
      while (true) {
        const page = asRows(await entity.filter(cursor ? { id: { $gt: cursor } } : {}, "id", pageSize));
        for (const record of page) {
          if (!record.id || (cursor && record.id <= cursor)) {
            throw new Error("Records changed during export. Retry with edits paused.");
          }
          cursor = record.id;
          records.push(actor.role === "admin" ? record : linkedView(record));
        }
        if (page.length < pageSize) break;
      }
      if (records.length !== expectedCount || await entity.count({}) !== expectedCount) {
        throw new Error("Record counts changed during export. Retry with edits paused.");
      }
      return [object, records];
    }));
    return { format: "detent-crm", version: 1, exported_at: new Date().toISOString(), records: Object.fromEntries(entries) };
  });

export const getSourceProperties = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ object: z.enum(["Account", "Contact", "Deal", "Activity"]), id: z.string().min(1).max(100) }))
  .handler(async ({ context, data }) => {
    if (context.user.role !== "admin") deny("CRM admin access required.");
    const record = await context.getBase44().asServiceRole.entities[data.object].get(data.id);
    if (!record?.hubspot_source_key) return null;
    return {
      sourceKey: record.hubspot_source_key,
      properties: Object.entries(record.hubspot_source_fields ?? {})
        .filter(([, value]) => typeof value === "string" && value !== "")
        .sort(([left], [right]) => left.localeCompare(right, "en-GB")),
    };
  });
