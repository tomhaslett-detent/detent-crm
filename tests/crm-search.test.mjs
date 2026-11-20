import assert from "node:assert/strict";
import test from "node:test";
import { crmSearchFilter } from "../src/lib/crm-search.js";

test("account searches escape punctuation and match case variants", () => {
  const [name, domain, owner] = crmSearchFilter("Account", " A.C+ ").$or;
  assert.deepEqual(Object.keys(domain), ["domain"]);
  assert.deepEqual(Object.keys(owner), ["owner"]);
  const pattern = new RegExp(name.name.$regex);
  assert.equal(pattern.test("a.c+ Ltd"), true);
  assert.equal(pattern.test("aZcc Ltd"), false);
});

test("contacts search only the permitted directory fields", () => {
  assert.deepEqual(crmSearchFilter("Contact", "x").$or.flatMap(Object.keys), ["first_name", "last_name", "email", "account_name", "title"]);
  assert.deepEqual(crmSearchFilter("Activity", "x"), {});
  assert.deepEqual(crmSearchFilter("Contact", " "), {});
});
