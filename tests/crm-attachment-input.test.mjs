import assert from "node:assert/strict";
import test from "node:test";
import { attachmentInput, maxAttachmentBytes } from "../src/lib/crm-attachment-input.js";

function attachment(filename, contents = "test", source = "123") {
  const form = new globalThis.FormData();
  form.set("activityId", "activity-1");
  form.set("sourceId", source);
  form.set("file", new globalThis.File([contents], filename));
  return form;
}

test("private upload accepts supported files and preserves their source reference", () => {
  const result = attachmentInput(attachment("Meeting notes.pdf"));
  assert.equal(result.activityId, "activity-1");
  assert.equal(result.sourceId, "123");
  assert.equal(result.filename, "Meeting notes.pdf");
});

test("upload input rejects executable filenames, arbitrary references and oversized files", () => {
  assert.throws(() => attachmentInput(attachment("file.html")), /supported/);
  assert.throws(() => attachmentInput(attachment("file.pdf", "test", "bad:id")), /Invalid/);
  assert.throws(() => attachmentInput(attachment("file.pdf", new Uint8Array(maxAttachmentBytes + 1))), /8 MB/);
});
