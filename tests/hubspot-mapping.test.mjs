import test from "node:test";
import assert from "node:assert/strict";
import { projectRecord, summarizePage } from "../src/lib/hubspot-mapping.js";

test("company maps numeric count and stable source identity", () => {
  const result = projectRecord("companies", { id: "101", properties: { name: "Example Ltd", numberofemployees: "12" } });
  assert.deepEqual(result.values, { name: "Example Ltd", employees: 12 });
  assert.equal(result.sourceKey, "149444037:companies:101");
  assert.deepEqual(result.issues, []);
});

test("contact preserves source association IDs and reports unsupported multiplicity", () => {
  const summary = summarizePage("contacts", {
    results: [{ id: "42", properties: { firstname: "Demo", hubspot_owner_id: "8" }, associations: { companies: { results: [{ id: "1" }, { id: "2" }] } } }],
    paging: { next: { after: "42" } },
  });
  assert.deepEqual(summary, { sampled: 1, mapped: 0, withSourceOwner: 1, associations: { companies: 2 }, issues: { multiple_associations_require_mapping: 1 }, hasMore: true });
});

test("deal flags stage conversion and missing currency", () => {
  const result = projectRecord("deals", { id: "99", properties: { dealname: "Demo", amount: "100", dealstage: "qualified", pipeline: "default" } });
  assert.deepEqual(result.issues, ["stage_mapping_required", "amount_without_currency"]);
  assert.equal(result.stageId, "qualified");
  assert.equal(result.pipelineId, "default");
});

test("empty source ID, required field and bad numbers are flagged", () => {
  assert.deepEqual(projectRecord("companies", { properties: { numberofemployees: "many" } }).issues,
    ["invalid_numeric_value", "missing_destination_required_field", "missing_source_id"]);
});
