import { crmCurrencies } from "./crm-regional.js";
import { detentHubSpotOrigin, importKey, validImportId } from "./crm-import-source.js";
import Papa from "papaparse";

export const dealColumns = ["Record ID", "Deal Name", "Pipeline", "Deal Stage", "CRM Stage", "Amount", "Currency", "Close Date", "Deal owner", "Associated Company IDs", "Associated Company IDs (Primary)", "Associated Contact IDs"];
export const crmStages = ["prospect", "engaged", "proposal", "at_risk", "closed_won", "closed_lost"];

function ids(value, origin) {
  const parts = (value ?? "").trim().split(/[;,\s]+/).filter(Boolean);
  if (parts.some((part) => !validImportId(part, origin))) throw new Error("Associations need valid source IDs.");
  return [...new Set(parts)];
}

export function dealRow(raw, origin = detentHubSpotOrigin) {
  const id = raw["record id"]?.trim();
  const title = raw["deal name"]?.trim();
  const stage = raw["crm stage"]?.trim().toLowerCase();
  if (!id || !validImportId(id, origin) || !title) throw new Error("Record ID and Deal Name are required.");
  if (!crmStages.includes(stage)) throw new Error("Map CRM Stage explicitly to " + crmStages.join(", ") + ".");
  const amount = raw.amount?.trim();
  const currency = (raw.currency || raw["deal currency code"] || "").trim().toUpperCase();
  if (amount && (!/^-?\d+(?:\.\d+)?$/.test(amount) || !Number.isFinite(Number(amount)) || !currency)) throw new Error("Provide a decimal amount and currency.");
  if (currency && !crmCurrencies.includes(currency)) throw new Error("This deal currency is not supported in CRM.");
  const closeDate = raw["close date"]?.trim();
  if (closeDate && (!/^\d{4}-\d{2}-\d{2}$/.test(closeDate) ||
      !Number.isFinite(Date.parse(closeDate)) || new Date(closeDate).toISOString().slice(0, 10) !== closeDate)) throw new Error("Close Date must be a valid YYYY-MM-DD date.");
  const primary = ids(raw["associated company ids (primary)"], origin);
  if (primary.length > 1) throw new Error("A deal can have only one primary company.");
  const companies = [...new Set([...ids(raw["associated company ids"], origin), ...primary])];
  return {
    key: importKey(origin, "deals", id),
    fields: { title, stage, ...(amount ? { value: Number(amount) } : {}), ...(currency ? { currency } : {}), ...(closeDate ? { close_date: closeDate } : {}) },
    companies, primary: primary[0] ?? (companies.length === 1 ? companies[0] : null),
    contacts: ids(raw["associated contact ids"], origin),
  };
}

export function readDealCsv(text, origin = detentHubSpotOrigin) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: "greedy", transformHeader: (x) => x.trim().toLowerCase() });
  if (parsed.errors.length || Object.values(parsed.meta.renamedHeaders ?? {}).some((x) => ["record id", "deal name", "crm stage"].includes(x))) throw new Error("The CSV has malformed rows or ambiguous required headers.");
  const seen = new Set();
  for (const [index, raw] of parsed.data.entries()) {
    try {
      const { key } = dealRow(raw, origin);
      if (seen.has(key)) throw new Error("Duplicate deal source ID.");
      seen.add(key);
    } catch (error) {
      throw new Error("Row " + (index + 2) + ": " + error.message);
    }
  }
  return parsed.data;
}
