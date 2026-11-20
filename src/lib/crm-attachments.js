import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { actorFor } from "@/lib/crm-access";
import { mayAccess } from "@/lib/crm-policy";
import { attachmentInput } from "@/lib/crm-attachment-input";

const id = z.string().min(1).max(100);
const rows = (value) => Array.isArray(value) ? value : value?.items ?? [];
async function activityAccess(context, activityId, write = false) {
  const actor = await actorFor(context);
  if (!actor) throw new Error("CRM access required.");
  const service = context.getBase44().asServiceRole;
  const activity = await service.entities.Activity.get(activityId);
  if (!activity || !mayAccess(actor, "read", "Activity", activity) ||
      (write && !mayAccess(actor, "update", "Activity", activity))) throw new Error("Activity access required.");
  return { service, activity, actor };
}

export const listActivityAttachments = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ activityId: id }))
  .handler(async ({ context, data }) => {
    const { service, activity, actor } = await activityAccess(context, data.activityId);
    const stored = rows(await service.entities.CrmAttachment.filter({ activity_id: activity.id }, "filename", 50, 0, ["id", "filename", "size", "source_attachment_id"]));
    const linked = new Set(stored.map((file) => file.source_attachment_id).filter(Boolean));
    return {
      attachments: stored.map(({ id, filename, size }) => ({ id, filename, size })),
      pendingSourceIds: actor.role === "admin" ? (activity.source_attachment_ids ?? []).filter((id) => !linked.has(id)) : [],
      canUpload: mayAccess(actor, "update", "Activity", activity),
    };
  });

export const uploadActivityAttachment = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(attachmentInput)
  .handler(async ({ context, data }) => {
    const { activityId, sourceId, file, filename } = data;
    const { service, activity, actor } = await activityAccess(context, activityId, true);
    const entity = service.entities.CrmAttachment;
    if (sourceId) {
      if (actor.role !== "admin" || !activity.source_attachment_ids?.includes(sourceId)) throw new Error("This source attachment ID is not on the activity.");
      if (await entity.count({ activity_id: activityId, source_attachment_id: sourceId })) throw new Error("This source attachment has already been linked.");
    }
    if (await entity.count({ activity_id: activityId }) >= 50) throw new Error("This activity has reached its attachment limit.");
    const { file_uri: uri } = await service.integrations.Core.UploadPrivateFile({ file });
    if (typeof uri !== "string" || !uri.startsWith("private/")) throw new Error("Private storage did not return a valid file reference.");
    const stored = await entity.create({
      activity_id: activityId, filename, file_uri: uri, size: file.size,
      ...(sourceId ? { source_attachment_id: sourceId } : {}),
    });
    return { id: stored.id };
  });

export const openActivityAttachment = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ activityId: id, attachmentId: id }))
  .handler(async ({ context, data }) => {
    const { service } = await activityAccess(context, data.activityId);
    const attachment = await service.entities.CrmAttachment.get(data.attachmentId);
    if (!attachment || attachment.activity_id !== data.activityId || !attachment.file_uri?.startsWith("private/")) {
      throw new Error("Attachment not found.");
    }
    const { signed_url: url } = await service.integrations.Core.CreateFileSignedUrl({ file_uri: attachment.file_uri, expires_in: 120 });
    if (typeof url !== "string" || new URL(url).protocol !== "https:") throw new Error("Could not open the private file.");
    return { url };
  });
