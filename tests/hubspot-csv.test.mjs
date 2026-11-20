import assert from "node:assert/strict";
import test from "node:test";
import { parseHubSpotCsv, companyLinks } from "../src/lib/hubspot-csv.js";

test("CSV keeps exact source IDs and quoted multiline fields", () => {
  const records = parseHubSpotCsv('Record ID,Name,Notes\r\n9007199254740993,"Demo, Ltd","first\nsecond"\r\n', "companies");
  assert.equal(records[0]["record id"], "9007199254740993");
  assert.equal(records[0].name, "Demo, Ltd");
  assert.equal(records[0].notes, "first\nsecond");
});

test("duplicate and malformed IDs fail validation", () => {
  assert.throws(() => parseHubSpotCsv("Record ID,Name\n12,First\n12,Second", "companies"), /duplicate/i);
  assert.throws(() => parseHubSpotCsv("Record ID,Name\n1E3,First", "companies"), /Record ID/);
});

test("retains all links and chooses only an explicit primary or sole company", () => {
  assert.deepEqual(companyLinks({ "associated company ids": "1;2", "associated company (primary) ids": "2" }), { all: ["1", "2"], primary: "2" });
  assert.deepEqual(companyLinks({ "associated company ids": "1;2" }), { all: ["1", "2"], primary: null });
  assert.deepEqual(companyLinks({ "associated company ids": "9" }), { all: ["9"], primary: "9" });
  assert.throws(() => companyLinks({ "associated company ids": "invalid" }), /format/);
});

test("HubSpot repeated display labels preserve both source values", () => {
  const records = parseHubSpotCsv("Record ID,Name,Parent Company,Parent Company\n1,Demo,One,Two", "companies");
  assert.equal(records[0]["parent company"], "One");
  assert.equal(records[0]["parent company_1"], "Two");
});

test("template workbook round trips both object sheets", async () => {
  const { makeImportWorkbook, readImportWorkbook } = await import("../src/lib/crm-import-workbook.js");
  const bytes = await makeImportWorkbook();
  const [companies, contacts] = await readImportWorkbook({ size: bytes.byteLength, arrayBuffer: async () => bytes });
  assert.deepEqual(parseHubSpotCsv(companies, "companies"), []);
  assert.deepEqual(parseHubSpotCsv(contacts, "contacts"), []);
});

test("blank and unrecognized global opt-out are unknown; a negative is not consent", async () => {
  const { importedEmailStatus } = await import("../src/lib/hubspot-csv.js");
  assert.equal(importedEmailStatus({}), "unknown");
  assert.equal(importedEmailStatus({ "unsubscribed from all email": "" }), "unknown");
  assert.equal(importedEmailStatus({ "unsubscribed from all email": "Yes" }), "unsubscribed");
  assert.equal(importedEmailStatus({ "unsubscribed from all email": "No" }), "no_global_opt_out_recorded");
});

test("CSV batches enforce row and encoded byte limits and omit blank source values", async () => {
  const { csvImportBatches } = await import("../src/lib/hubspot-csv.js");
  const row = { "record id": "1", note: "éééé", empty: "" };
  const other = { "record id": "2", note: "text" };
  const [single] = [...csvImportBatches([row, other])];
  assert.deepEqual(single[0], { "record id": "1", note: "éééé" });
  assert.equal([...csvImportBatches([row, other], { maxRows: 1 })].length, 2);
  assert.equal([...csvImportBatches([row, other], { maxBytes: 50 })].length, 2);
  assert.throws(() => [...csvImportBatches([{ note: "a".repeat(500000) }])], /exceeds 500 KB/);
});
