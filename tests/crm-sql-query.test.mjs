import assert from "node:assert/strict";
import test from "node:test";
import { crmPatternToLike, sqlArguments } from "../server/sql-query.js";
import { crmSearchFilter } from "../src/lib/crm-search.js";

test("preserves CRM source anchors and escapes LIKE wildcards", () => {
  assert.equal(crmPatternToLike("^149444037:contacts:"), "149444037:contacts:%");
  const { hubspot_source_key } = crmSearchFilter("Account", "id:Ab.123", true, true);
  assert.equal(crmPatternToLike(hubspot_source_key.$regex), "%:Ab.123");
  assert.equal(crmPatternToLike("[aA]_%"), "%[aA]~_~%%");
  assert.equal(crmPatternToLike("amount\\$"), "%amount$%");
  assert.throws(() => crmPatternToLike("a.*"), /Unsupported/);
});

test("binds association, owner and cursor queries without embedding values", () => {
  const args = sqlArguments();
  const filter = args.filter({
    id: { $gt: "cursor" },
    $and: [
      { $or: [{ account_id: "main" }, { hubspot_account_ids: { $all: ["secondary"] } }] },
      { "hubspot_source_fields.deal owner": "O'Connell" },
    ],
  });
  assert.match(filter, /\[id\] > @p0/);
  assert.match(filter, /OPENJSON/);
  assert.doesNotMatch(filter, /secondary|Connell|deal owner/);
  assert.ok(args.parameters.includes("secondary"));
  assert.ok(args.parameters.includes("O'Connell"));
  assert.ok(args.parameters.includes('$."hubspot_source_fields"."deal owner"'));
});
