import { importKey, importOrigin, sourceNamePattern } from "@/lib/crm-import-source";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { dealRow } from "@/lib/hubspot-deals";

async function indexRecords(entity, keys) {
  const found = new Map();
  for (let offset = 0; offset < keys.length; offset += 75) {
    const batch = keys.slice(offset, offset + 75);
    const response = await entity.filter({ hubspot_source_key: { $in: batch } }, "id", 150);
    for (const record of Array.isArray(response) ? response : response?.items ?? []) {
      if (found.has(record.hubspot_source_key)) throw new Error("Duplicate destination source ID.");
      found.set(record.hubspot_source_key, record);
    }
  }
  return found;
}

function reconcile(expected, current) {
  if (!current?.id || expected.hubspot_source_key !== current.hubspot_source_key) throw new Error("Deal source ID did not reconcile.");
  for (const field of ["title", "stage", "value", "currency", "close_date", "account_id", "contact_id"]) {
    if ((expected[field] ?? "") !== (current[field] ?? "")) throw new Error("Stored deal differs in " + field + ". Review before retrying.");
  }
  const storedSource = new Map(Object.entries(current.hubspot_source_fields ?? {}).map(([label, value]) => [label.toLowerCase(), value]));
  for (const field of ["pipeline", "deal stage", "deal owner"]) {
    const sourceValue = expected.hubspot_source_fields[field]?.trim();
    if (sourceValue && sourceValue !== String(storedSource.get(field) ?? "").trim()) {
      throw new Error("Stored source " + field + " differs from the import file. Review before retrying.");
    }
  }
  for (const field of ["hubspot_account_ids", "hubspot_contact_ids"]) {
    if (JSON.stringify([...expected[field]].sort()) !== JSON.stringify([...(current[field] ?? [])].sort())) throw new Error("Deal associations did not reconcile.");
  }
}

export const importDealBatch = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ records: z.array(z.record(z.string().max(500), z.string().max(500000))).min(1).max(50), source: z.string().regex(sourceNamePattern).optional(), preview: z.boolean() }))
  .handler(async ({ context, data }) => {
    if (context.user.role !== "admin") throw new Error("CRM admin access required.");
    const origin = importOrigin(data.source);
    const { Account, Contact, Deal } = context.getBase44().asServiceRole.entities;
    const rows = data.records.map((raw) => dealRow(raw, origin));
    const keys = [...new Set(rows.map(({ key }) => key))];
    if (keys.length !== rows.length) throw new Error("Duplicate deal source IDs.");
    const companyKeys = [...new Set(rows.flatMap((row) => row.companies.map((id) => importKey(origin, "companies", id))))];
    const contactKeys = [...new Set(rows.flatMap((row) => row.contacts.map((id) => importKey(origin, "contacts", id))))];
    const [accounts, contacts, existing] = await Promise.all([indexRecords(Account, companyKeys), indexRecords(Contact, contactKeys), indexRecords(Deal, keys)]);
    for (const [kind, keys, matches] of [["company", companyKeys, accounts], ["contact", contactKeys, contacts]]) {
      const missing = keys.find((key) => !matches.has(key));
      if (missing) throw new Error("Deal references an unimported " + kind + " ID " + missing.split(":").at(-1) + ".");
    }
    const expected = rows.map((row, index) => {
      const company = row.primary ? accounts.get(importKey(origin, "companies", row.primary)) : null;
      const contact = row.contacts.length === 1 ? contacts.get(importKey(origin, "contacts", row.contacts[0])) : null;
      return {
        ...row.fields,
        hubspot_source_key: row.key,
        hubspot_source_fields: data.records[index],
        hubspot_account_ids: row.companies.map((id) => accounts.get(importKey(origin, "companies", id)).id),
        hubspot_contact_ids: row.contacts.map((id) => contacts.get(importKey(origin, "contacts", id)).id),
        account_id: company?.id ?? "",
        account_name: company?.name ?? "",
        contact_id: contact?.id ?? "",
        contact_name: contact ? [contact.first_name, contact.last_name].filter(Boolean).join(" ") : "",
      };
    });
    for (const record of expected) {
      if (existing.has(record.hubspot_source_key)) reconcile(record, existing.get(record.hubspot_source_key));
    }
    const pending = expected.filter((record) => !existing.has(record.hubspot_source_key));
    if (!data.preview && pending.length) {
      await Deal.bulkCreate(pending);
      const stored = await indexRecords(Deal, keys);
      for (const record of expected) reconcile(record, stored.get(record.hubspot_source_key));
    }
    return { verified: expected.length, added: data.preview ? 0 : pending.length };
  });
