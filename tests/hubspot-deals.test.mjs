import assert from "node:assert/strict";
import test from "node:test";
import { dealRow, readDealCsv } from "../src/lib/hubspot-deals.js";

test("deal mapping keeps source identity, primary, associations, amount and date", () => {
  const [raw] = readDealCsv("Record ID,Deal Name,CRM Stage,Amount,Currency,Close Date,Associated Company IDs,Associated Company IDs (Primary),Associated Contact IDs\n9007199254740993,Demo,closed_won,0,GBP,2026-11-20,5;6,6,7;8");
  const result = dealRow(raw);
  assert.equal(result.key, "149444037:deals:9007199254740993");
  assert.equal(result.primary, "6");
  assert.deepEqual(result.companies, ["5", "6"]);
  assert.deepEqual(result.contacts, ["7", "8"]);
  assert.deepEqual(result.fields, { title: "Demo", stage: "closed_won", value: 0, currency: "GBP", close_date: "2026-11-20" });
});

test("deal mapping requires a destination stage and rejects invalid money, dates and identities", () => {
  const base = { "record id": "1", "deal name": "Demo", "crm stage": "proposal" };
  assert.throws(() => dealRow({ ...base, "crm stage": "Contract Sent" }), /explicitly/);
  assert.throws(() => dealRow({ ...base, amount: "1,000" }), /decimal/);
  assert.throws(() => dealRow({ ...base, "close date": "2026-02-30" }), /valid/);
  assert.throws(() => dealRow({ ...base, "associated company ids (primary)": "1;2" }), /only one/);
  assert.throws(() => readDealCsv("Record ID,Deal Name,CRM Stage\n1,Demo,proposal\n1,Demo,proposal"), /Duplicate/);
});

test("CSV imports accept non-HubSpot source IDs and isolate datasets", () => {
  const input = { "record id": "D-1", "deal name": "Demo", "crm stage": "proposal", "associated company ids": "A_1;A-2" };
  const first = dealRow(input, "file:erp-one");
  assert.equal(first.key, "file:erp-one:deals:D-1");
  assert.deepEqual(first.companies, ["A_1", "A-2"]);
  assert.equal(dealRow(input, "file:erp-two").key, "file:erp-two:deals:D-1");
  assert.throws(() => dealRow(input), /Record ID/);
});
