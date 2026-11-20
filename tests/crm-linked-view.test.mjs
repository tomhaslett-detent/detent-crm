import assert from "node:assert/strict";
import test from "node:test";
import { linkedIds, linkedView } from "../src/lib/crm-linked-view.js";
import { crmSearchFilter } from "../src/lib/crm-search.js";

test("scoped readers can see only links that independently pass record access", () => {
  const record = { id: "contact", account_id: "hidden", account_name: "Hidden", hubspot_account_ids: ["hidden", "visible"], hubspot_source_fields: { private: "value" }, source_attachment_ids: ["file"] };
  assert.deepEqual(linkedIds([record]), [["Account", ["hidden", "visible"]], ["Contact", []], ["Deal", []]]);
  assert.deepEqual(linkedView(record, { Account: new Set(["visible"]) }), { id: "contact", hubspot_account_ids: ["visible"] });
  assert.equal(record.account_name, "Hidden");
  assert.equal(linkedView(record).account_id, "hidden");
  assert.equal(linkedView(record).hubspot_source_fields, undefined);
  assert.equal(linkedView(record).source_attachment_ids, undefined);
  assert.deepEqual(record.source_attachment_ids, ["file"]);
});

test("scoped contact search cannot probe masked linked account names", () => {
  const fields = crmSearchFilter("Contact", "demo", false).$or.flatMap(Object.keys);
  assert.equal(fields.includes("account_name"), false);
});
