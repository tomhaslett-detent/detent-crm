import assert from "node:assert/strict";
import test from "node:test";
import { currencyTotals, dateForRegion, moneyForRegion } from "../src/lib/crm-regional.js";

test("calendar dates remain stable across time zones and an activity timestamp shifts", () => {
  const uk = { locale: "en-GB", time_zone: "Europe/London", currency: "GBP" };
  const la = { ...uk, time_zone: "America/Los_Angeles" };
  assert.equal(dateForRegion("2026-11-20", uk), dateForRegion("2026-11-20", la));
  assert.notEqual(dateForRegion("2026-11-20T00:10:00Z", uk, true), dateForRegion("2026-11-20T00:10:00Z", la, true));
});

test("mixed pipeline currencies stay separate and missing currency is not inferred", () => {
  const result = currencyTotals([{ value: 10, currency: "AUD" }, { value: 3, currency: "AUD" }, { value: 5, currency: "EUR" }, { value: 99 }]);
  assert.deepEqual(result, [["AUD", 13], ["EUR", 5]]);
  assert.equal(moneyForRegion(123, undefined), "—");
  assert.match(moneyForRegion(1234.56, "AUD", { locale: "de-DE" }), /1\.234,56/);
});
