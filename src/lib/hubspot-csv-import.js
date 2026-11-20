import { activityTypes } from "@/lib/hubspot-activities";
import { importKey as key, importOrigin, detentHubSpotOrigin, sourceNamePattern, validImportId } from "@/lib/crm-import-source";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { companyLinks, importedEmailStatus } from "@/lib/hubspot-csv";

const list = (response) => Array.isArray(response) ? response : response?.items ?? [];

async function findCompanies(Account, keys) {
  const accountsByKey = new Map();
  for (let index = 0; index < keys.length; index += 100) {
    const chunk = keys.slice(index, index + 100);
    const matches = list(await Account.filter({ hubspot_source_key: { $in: chunk } }, "id", 101));
    for (const account of matches) {
      if (accountsByKey.has(account.hubspot_source_key)) throw new Error("Duplicate company source ID.");
      accountsByKey.set(account.hubspot_source_key, account);
    }
  }
  return accountsByKey;
}

export const validateImportedCompanyLinks = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({
    source: z.string().regex(sourceNamePattern).optional(),
    ids: z.array(z.string().max(128)).min(1).max(100),
  }))
  .handler(async ({ context, data }) => {
    if (context.user.role !== "admin") throw new Error("CRM admin access required.");
    const origin = importOrigin(data.source);
    if (data.ids.some((id) => !validImportId(id, origin))) throw new Error("A company Record ID is invalid.");
    const keys = [...new Set(data.ids)].map((id) => key(origin, "companies", id));
    const found = await findCompanies(context.getBase44().asServiceRole.entities.Account, keys);
    return { missing: keys.length - found.size };
  });

export const importHubSpotBatch = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({
    kind: z.enum(["companies", "contacts"]),
    source: z.string().regex(sourceNamePattern).optional(),
    records: z.array(z.record(z.string().max(500), z.string())).min(1).max(50),
  }))
  .handler(async ({ context, data }) => {
    if (context.user.role !== "admin") throw new Error("CRM admin access required.");
    const origin = importOrigin(data.source);
    const entities = context.getBase44().asServiceRole.entities;
    const entity = data.kind === "companies" ? entities.Account : entities.Contact;
    const rows = data.records.map((raw) => {
      const id = raw["record id"]?.trim();
      if (!validImportId(id, origin)) throw new Error("A source Record ID is invalid.");
      return { raw, id, source: key(origin, data.kind, id) };
    });
    const ids = rows.map((row) => row.source);
    if (new Set(ids).size !== ids.length) throw new Error("Duplicate source IDs in batch.");
    const existing = list(await entity.filter({ hubspot_source_key: { $in: ids } }, "id", 100));
    const saved = new Set(existing.map((record) => record.hubspot_source_key));
    if (saved.size !== existing.length) throw new Error("Duplicate destination source IDs require reconciliation.");

    const pending = rows.filter((row) => !saved.has(row.source));
    const creates = [];
    const linksBySource = new Map();
    const companyKeys = new Set();
    if (data.kind === "contacts") {
      for (const { raw, source } of rows) {
        const links = companyLinks(raw, origin);
        linksBySource.set(source, links);
        for (const id of links.all) companyKeys.add(key(origin, "companies", id));
      }
    }
    const accountsByKey = await findCompanies(entities.Account, [...companyKeys]);
    if (accountsByKey.size !== companyKeys.size) {
      throw new Error("A contact references a missing company. Import and reconcile companies first.");
    }

    for (const { raw, id, source } of pending) {
      const provenance = { hubspot_source_key: source, hubspot_source_fields: raw };
      if (data.kind === "companies") {
        creates.push({ ...provenance, name: raw["company name"] || raw.name || raw["company domain name"] || "Imported company " + id,
          domain: raw["company domain name"] || raw.domain || "", industry: raw.industry || "", website: raw["website url"] || "" });
        continue;
      }
      const links = linksBySource.get(source);
      const accounts = links.all.map((companyId) => accountsByKey.get(key(origin, "companies", companyId)));
      const primary = accountsByKey.get(key(origin, "companies", links.primary));
      creates.push({ ...provenance, first_name: raw["first name"] || raw["last name"] || raw.email || "Imported contact " + id,
        last_name: raw["first name"] ? raw["last name"] || "" : "", email: raw.email || "", phone: raw["phone number"] || "",
        title: raw["job title"] || "", account_id: primary?.id || "", account_name: primary?.name || "",
        hubspot_account_ids: accounts.map((account) => account.id),
        imported_email_status: importedEmailStatus(raw) });
    }
    if (creates.length) await entity.bulkCreate(creates);
    const verified = list(await entity.filter({ hubspot_source_key: { $in: ids } }, "id", 100));
    if (verified.length !== ids.length || new Set(verified.map((record) => record.hubspot_source_key)).size !== ids.length) {
      throw new Error("Batch reconciliation failed. Retry from the original files.");
    }
    if (data.kind === "contacts") {
      const bySource = new Map(verified.map((record) => [record.hubspot_source_key, record]));
      for (const { raw, source } of rows) {
        const actual = bySource.get(source);
        const links = linksBySource.get(source);
        const expectedIds = links.all.map((id) => accountsByKey.get(key(origin, "companies", id)).id).sort();
        const primaryId = accountsByKey.get(key(origin, "companies", links.primary))?.id || "";
        const actualIds = [...(actual.hubspot_account_ids ?? [])].sort();
        if ((actual.account_id || "") !== primaryId ||
            JSON.stringify(actualIds) !== JSON.stringify(expectedIds) ||
            (actual.imported_email_status ?? "unknown") !== importedEmailStatus(raw)) {
          throw new Error("An existing contact has different imported links or email status. Review the destination before retrying.");
        }
      }
    }
    return { added: creates.length, existing: existing.length, verified: verified.length };
  });

export const getHubSpotImportCounts = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin") throw new Error("CRM admin access required.");
    const { Account, Contact, Deal, Activity } = context.getBase44().asServiceRole.entities;
    const count = (entity, kind) => entity.count({
      hubspot_source_key: { $regex: "^" + key(detentHubSpotOrigin, kind, "") },
    });
    const [companies, contacts, deals, ...activities] = await Promise.all([
      count(Account, "companies"),
      count(Contact, "contacts"),
      count(Deal, "deals"),
      ...activityTypes.map((kind) => count(Activity, kind)),
    ]);
    return { companies, contacts, deals, activities: activityTypes.map((kind, i) => ({
      kind, count: activities[i],
    })) };
  });
