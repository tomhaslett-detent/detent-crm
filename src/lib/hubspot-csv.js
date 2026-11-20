import { detentHubSpotOrigin, validImportId } from "./crm-import-source.js";
import Papa from "papaparse";

const normalize = (name) => name.replace(/^\uFEFF/, "").trim().toLowerCase();

export function parseHubSpotCsv(text, kind, origin = detentHubSpotOrigin) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: "greedy", transformHeader: normalize });
  if (parsed.errors.length) {
    throw new Error("The CSV has malformed rows.");
  }
  const headers = parsed.meta.fields ?? [];
  const repeated = parsed.meta.renamedHeaders ?? {};
  if (Object.values(repeated).includes("record id")) throw new Error("Duplicate Record ID header.");
  if (kind === "contacts" && !headers.some((name) => /^associated.*compan.*\bids?\b/.test(name))) {
    throw new Error("The contacts CSV is missing company association IDs.");
  }
  const expected = kind === "companies" ? ["company name", "name"] : ["first name", "last name", "email"];
  if (!headers.includes("record id") || !expected.some((name) => headers.includes(name))) {
    throw new Error("Choose the " + kind + " export with the Record ID column and the import template headers.");
  }
  const seen = new Set();
  return parsed.data.map((raw, index) => {
    const id = raw["record id"]?.trim();
    if (!validImportId(id, origin) || seen.has(id)) throw new Error("Missing or duplicate Record ID on data row " + (index + 1));
    seen.add(id);
    return raw;
  });
}

export function companyLinks(row, origin = detentHubSpotOrigin) {
  const all = new Set();
  const primary = new Set();
  for (const [label, value] of Object.entries(row)) {
    if (!/^associated.*compan.*\bids?\b/.test(label) || !value) continue;
    for (const id of value.trim().split(/[;,\s]+/)) {
      if (!validImportId(id, origin)) throw new Error("Unsupported associated company ID format.");
      all.add(id);
      if (label.includes("primary")) primary.add(id);
    }
  }
  if (primary.size > 1) throw new Error("More than one primary company is marked.");
  return { all: [...all], primary: [...primary][0] ?? (all.size === 1 ? [...all][0] : null) };
}

export function importedEmailStatus(row) {
  const value = row["unsubscribed from all email"]?.trim().toLowerCase();
  if (["true", "yes", "1"].includes(value)) return "unsubscribed";
  if (["false", "no", "0"].includes(value)) return "no_global_opt_out_recorded";
  return "unknown";
}

export function* csvImportBatches(rows, { maxRows = 50, maxBytes = 80000 } = {}) {
  const encoder = new TextEncoder();
  let batch = [];
  let size = 2;
  for (const row of rows) {
    const populated = Object.fromEntries(Object.entries(row).filter(([, value]) => value !== ""));
    const next = encoder.encode(JSON.stringify(populated)).length + 1;
    if (next > 500000) throw new Error("An import row exceeds 500 KB. Review large text fields before retrying.");
    if (batch.length && (batch.length === maxRows || size + next > maxBytes)) {
      yield batch;
      batch = [];
      size = 2;
    }
    batch.push(populated);
    size += next;
  }
  if (batch.length) yield batch;
}
