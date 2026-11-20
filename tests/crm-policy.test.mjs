import test from "node:test";
import assert from "node:assert/strict";
import { mayAccess } from "../src/lib/crm-policy.js";

const own = { team_key: "north", owner_email: "rep@example.com" };
const teammate = { team_key: "north", owner_email: "teammate@example.com" };
const outside = { team_key: "south", owner_email: "outside@example.com" };

const matrix = {
  admin:   ["111", "111", "111", "111", "111", true],
  revops:  ["111", "111", "111", "000", "111", true],
  manager: ["110", "110", "110", "000", "110", false],
  rep:     ["100", "100", "100", "000", "100", false],
  service: ["110", "000", "000", "000", "110", false],
  viewer:  ["110", "000", "000", "000", "000", false],
  unknown: ["000", "000", "000", "000", "000", false],
};
for (const [role, expectations] of Object.entries(matrix)) {
  test(role + " permissions with dummy records across teams", () => {
    const actor = { role, email: own.owner_email, team: "north" };
    for (const [index, [action, object]] of [
      ["read", "Deal"], ["create", "Deal"], ["update", "Deal"],
      ["delete", "Deal"], ["update", "Activity"],
    ].entries()) {
      assert.equal([own, teammate, outside].map((record) => Number(mayAccess(actor, action, object, record))).join(""), expectations[index]);
    }
    assert.equal(mayAccess(actor, "export"), expectations[5]);
  });
}

test("signed-out and unassigned users have no record access", () => {
  assert.equal(mayAccess(null, "read", "Contact", own), false);
  assert.equal(mayAccess({ role: "manager" }, "read", "Contact", own), false);
});
