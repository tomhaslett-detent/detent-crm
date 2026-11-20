import { importKey, importOrigin, sourceNamePattern } from "@/lib/crm-import-source";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { activityRow } from "@/lib/hubspot-activities";

const rows = (response) => Array.isArray(response) ? response : response?.items ?? [];
const types = [
  ["companies", "Account", "account", (row) => row.name],
  ["contacts", "Contact", "contact", (row) => [row.first_name, row.last_name].filter(Boolean).join(" ")],
  ["deals", "Deal", "deal", (row) => row.title],
];
const scopeError = "The file references a missing or duplicate destination record. Load and reconcile its source records first.";

async function lookup(entity, keys) {
  const found = new Map();
  for (let index = 0; index < keys.length; index += 75) {
    const chunk = keys.slice(index, index + 75);
    for (const row of rows(await entity.filter({ hubspot_source_key: { $in: chunk } }, "id", 150))) {
      if (found.has(row.hubspot_source_key)) throw new Error(scopeError);
      found.set(row.hubspot_source_key, row);
    }
  }
  return found;
}

function reconcile(expected, stored) {
  if (!stored?.id || stored.hubspot_source_key !== expected.hubspot_source_key ||
      stored.type !== expected.type || Date.parse(stored.occurred_at) !== Date.parse(expected.occurred_at)) {
    throw new Error("Stored activity identity or timestamp did not reconcile.");
  }
  if ((stored.subject ?? "") !== expected.subject || (stored.body ?? "") !== expected.body) {
    throw new Error("Stored activity subject or body did not reconcile.");
  }
  for (const [, , field] of types) {
    if ((stored[field + "_id"] ?? "") !== (expected[field + "_id"] ?? "")) {
      throw new Error("Stored activity primary link did not reconcile.");
    }
  }
  for (const field of ["account_ids", "contact_ids", "deal_ids", "source_attachment_ids"]) {
    if (JSON.stringify([...(stored[field] ?? [])].sort()) !== JSON.stringify([...expected[field]].sort())) {
      throw new Error("Stored activity links did not reconcile.");
    }
  }
}

export const importActivityBatch = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({
    records: z.array(z.record(z.string().max(500), z.string().max(500000))).min(1).max(50),
    source: z.string().regex(sourceNamePattern).optional(), preview: z.boolean(),
  }))
  .handler(async ({ context, data }) => {
    if (context.user.role !== "admin") throw new Error("CRM admin access required.");
    const origin = importOrigin(data.source);
    const actors = context.getBase44().asServiceRole.entities;
    const input = data.records.map((raw) => activityRow(raw, origin));
    const keys = [...new Set(input.map(({ key }) => key))];
    if (keys.length !== input.length) throw new Error("Duplicate activity source IDs.");
    const linkedIndex = new Map();
    for (const [kind, entity] of types) {
      const ids = [...new Set(input.flatMap((row) => row[kind]))];
      if (!ids.length) continue;
      const keys = ids.map((id) => importKey(origin, kind, id));
      const linked = await lookup(actors[entity], keys);
      const missing = ids.find((id) => !linked.has(importKey(origin, kind, id)));
      if (missing) throw new Error("Activity references an unimported " + kind + " record with ID " + missing + ".");
      for (const [key, value] of linked) linkedIndex.set(key, value);
    }
    const expected = input.map((row, i) => {
      const record = {
        hubspot_source_key: row.key,
        hubspot_source_fields: data.records[i],
        type: row.type,
        subject: row.subject,
        body: row.body,
        occurred_at: row.occurredAt,
        source_attachment_ids: row.attachments,
      };
      for (const [kind, , field, displayName] of types) {
        const associated = row[kind].map((id) => linkedIndex.get(importKey(origin, kind, id)));
        record[field + "_ids"] = associated.map(({ id }) => id);
        if (associated.length === 1) {
          record[field + "_id"] = associated[0].id;
          record[field + "_name"] = displayName(associated[0]) ?? "";
        }
      }
      return record;
    });
    const prior = await lookup(actors.Activity, keys);
    for (const entry of expected) {
      const stored = prior.get(entry.hubspot_source_key);
      if (stored) reconcile(entry, stored);
    }
    const pending = expected.filter((entry) => !prior.has(entry.hubspot_source_key));
    if (!data.preview && pending.length) {
      await actors.Activity.bulkCreate(pending);
      const stored = await lookup(actors.Activity, keys);
      for (const entry of expected) reconcile(entry, stored.get(entry.hubspot_source_key));
    }
    return {
      verified: expected.length,
      added: data.preview ? 0 : pending.length,
      existing: prior.size,
      attachmentReferences: input.reduce((sum, row) => sum + row.attachments.length, 0),
    };
  });
