import assert from "node:assert/strict";
import test from "node:test";
import { activityRow, readActivityCsv } from "../src/lib/hubspot-activities.js";

test("activity preserves large source IDs, timestamp, body, and multiple associations", () => {
  const [raw] = readActivityCsv('Record ID,Activity Type,Occurred At,Body,Associated Company IDs,Associated Contact IDs,Attachment IDs\n9007199254740993,Note,2026-11-20T14:30:00+01:00,"a\nb",12;13,14;14,15');
  const result = activityRow(raw);
  assert.equal(result.key, "149444037:note:9007199254740993");
  assert.equal(result.occurredAt, "2026-11-20T13:30:00.000Z");
  assert.equal(result.body, "a\nb");
  assert.deepEqual(result.companies, ["12", "13"]);
  assert.deepEqual(result.contacts, ["14"]);
  assert.deepEqual(result.attachments, ["15"]);
});

test("activity preflight rejects ambiguous timestamps and duplicate identities", () => {
  const header = "Record ID,Activity Type,Occurred At\n";
  assert.throws(() => readActivityCsv(header + "1,call,2026-11-20 09:00:00"), /timezone/);
  const row = "1,call,2026-11-20T09:00:00Z";
  assert.throws(() => readActivityCsv(header + row + "\n" + row), /Duplicate/);
  assert.equal(readActivityCsv(header + row + "\n" + row.replace("call", "email")).length, 2);
});
