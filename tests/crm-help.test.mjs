import assert from "node:assert/strict";
import test from "node:test";
import { isDetentStaff } from "../src/lib/crm-staff.js";
import { publishedGuides, searchGuides, suppliedGuides } from "../src/lib/crm-help-content.js";

test("Command Centre requires Detent staff and an administrative role", () => {
  assert.equal(isDetentStaff(null), false);
  assert.equal(isDetentStaff({ role: "user", email: "rep@detentgtm.io" }), false);
  assert.equal(isDetentStaff({ role: "admin", email: "customer@example.com" }), false);
  assert.equal(isDetentStaff({ role: "admin", email: "manager@detentgtm.io.evil.example" }), false);
  assert.equal(isDetentStaff({ role: "admin", email: "admin@DETENTGTM.IO" }), true);
});

test("help search exposes published guides and excludes drafts and unpublished updates", () => {
  const catalog = publishedGuides([
    { article_key: "import", enabled: true, draft: { title: "draftsecret" }, published: { title: "Supported import", category: "Data", body: "Import companies from an Excel workbook." } },
    { article_key: "activity", enabled: false, published: suppliedGuides.find((guide) => guide.key === "activity") },
    { article_key: "private", enabled: false, draft: { title: "draftsecret", body: "CRM help" } },
  ]);
  assert.equal(catalog.some(({ key }) => key === "activity"), false);
  assert.deepEqual(searchGuides(catalog, "draftsecret"), []);
  assert.equal(searchGuides(catalog, "Supported import")[0].title, "Supported import");
});
