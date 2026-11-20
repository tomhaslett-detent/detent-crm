import { detentHubSpotOrigin, importKey, validImportId } from "./crm-import-source.js";
import Papa from "papaparse";

export const activityTypes = ["email", "note", "meeting", "task", "call"];
export const activityColumns = ["Record ID", "Activity Type", "Occurred At", "Subject", "Body", "Associated Company IDs", "Associated Contact IDs", "Associated Deal IDs", "Attachment IDs"];


function parseIds(value, origin) {
  const ids = String(value ?? "").trim().split(/[;,\s]+/).filter(Boolean);
  if (ids.some((id) => !validImportId(id, origin))) throw new Error("Associated IDs must be valid source record IDs.");
  return [...new Set(ids)];
}

export function activityRow(raw, origin = detentHubSpotOrigin) {
  const id = String(raw["record id"] ?? "").trim();
  const type = String(raw["activity type"] ?? "").trim().toLowerCase();
  if (!validImportId(id, origin)) throw new Error("Activity Record ID must be a valid source ID.");
  if (!activityTypes.includes(type)) throw new Error("Choose email, note, meeting, task or call.");
  const date = String(raw["occurred at"] ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(date) || !Number.isFinite(Date.parse(date))) {
    throw new Error("Occurred At needs an ISO date and time with a timezone.");
  }
  return {
    key: importKey(origin, type, id),
    type,
    subject: String(raw.subject ?? "").trim() || "HubSpot " + type,
    body: raw.body ?? "",
    occurredAt: new Date(date).toISOString(),
    companies: parseIds(raw["associated company ids"], origin),
    contacts: parseIds(raw["associated contact ids"], origin),
    deals: parseIds(raw["associated deal ids"], origin),
    attachments: parseIds(raw["attachment ids"], origin),
  };
}

export function readActivityCsv(text, origin = detentHubSpotOrigin) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: "greedy", transformHeader: (name) => name.trim().toLowerCase() });
  if (parsed.errors.length || Object.keys(parsed.meta.renamedHeaders ?? {}).length) throw new Error("The CSV has malformed rows or repeated headers.");
  const columns = parsed.meta.fields ?? [];
  if (!["record id", "activity type", "occurred at"].every((name) => columns.includes(name))) throw new Error("Use the activity import headers.");
  const seen = new Set();
  for (const [index, record] of parsed.data.entries()) {
    try {
      const { key } = activityRow(record, origin);
      if (seen.has(key)) throw new Error("Duplicate activity type and ID.");
      seen.add(key);
    } catch (error) {
      throw new Error("Row " + (index + 2) + ": " + error.message);
    }
  }
  return parsed.data;
}

export function compareActivityInventory(text, records, origin, restoreLinks = false) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: "greedy" });
  if (parsed.errors.length || !["Type", "SourceRecordId"].every((field) => parsed.meta.fields.includes(field))) {
    throw new Error("Use an activity inventory with Type and SourceRecordId columns.");
  }
  const linkColumns = ["LinkedObject", "LinkedSourceRecordId"];
  const compareLinks = linkColumns.every((field) => parsed.meta.fields.includes(field));
  if (!compareLinks && linkColumns.some((field) => parsed.meta.fields.includes(field))) {
    throw new Error("An association inventory needs both linked record columns.");
  }
  const expected = new Map();
  const expectedLinks = new Map();
  for (const { Type: type, SourceRecordId: id, LinkedObject: object, LinkedSourceRecordId: linkedId } of parsed.data) {
    if (!activityTypes.includes(type) || !validImportId(id, origin)) throw new Error("An inventory activity type or ID is invalid.");
    const key = importKey(origin, type, id);
    expected.set(key, [type, id]);
    if (compareLinks) {
      if (!["companies", "contacts", "deals"].includes(object) || !validImportId(linkedId, origin)) {
        throw new Error("An inventory association has an invalid object or source record ID.");
      }
      const links = expectedLinks.get(key) ?? new Map();
      links.set(object + ":" + linkedId, [object, linkedId]);
      expectedLinks.set(key, links);
    }
  }
  if (!expected.size) throw new Error("The activity inventory has no records.");
  const actual = new Map(records.map((raw) => {
    const row = activityRow(raw, origin);
    return [row.key, row];
  }));
  if (restoreLinks && !compareLinks) throw new Error("Upload an association inventory to restore links.");
  let missingLinks = 0;
  const restored = new Map();
  const headers = { companies: "associated company ids", contacts: "associated contact ids", deals: "associated deal ids" };
  for (const [key, links] of expectedLinks) {
    const row = actual.get(key);
    if (!row) continue;
    for (const [object, id] of links.values()) {
      if (row[object].includes(id)) continue;
      missingLinks += 1;
      if (restoreLinks) {
        row[object].push(id);
        const patch = restored.get(key) ?? {};
        patch[headers[object]] = row[object].join(";");
        restored.set(key, patch);
      }
    }
  }
  const missingRows = [...expected].filter(([key]) => !actual.has(key)).map(([, row]) => row);
  const matched = expected.size - missingRows.length;
  return {
    matched, compareLinks, missingLinks, missing: missingRows.length, additional: actual.size - matched,
    records: restoreLinks ? records.map((raw) => {
      const patch = restored.get(activityRow(raw, origin).key);
      return patch ? { ...raw, ...patch } : raw;
    }) : records,
    missingCsv: missingRows.length ? Papa.unparse([["Type", "SourceRecordId"], ...missingRows]) : "",
  };
}
