import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { actorFor } from "@/lib/crm-access";

const recordType = z.enum(["Account", "Contact"]);
const viewId = z.string().min(1).max(100);
const fields = z.object({ name: z.string().trim().min(1).max(80), search: z.string().trim().min(1).max(100) });

async function directory(context, object) {
  if (!await actorFor(context)) throw new Error("Active CRM access required.");
  return {
    entity: context.getBase44().asServiceRole.entities.CrmSavedView,
    scope: { user_id: context.user.id, record_type: object },
  };
}

export const getSavedViews = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ object: recordType }))
  .handler(async ({ context, data }) => {
    const { entity, scope } = await directory(context, data.object);
    const result = await entity.filter(scope, "name", 100, 0, ["id", "name", "search"]);
    const rows = Array.isArray(result) ? result : result?.items ?? [];
    return rows.map(({ id, name, search }) => ({ id, name, search }));
  });

export const changeSavedView = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.discriminatedUnion("action", [
    z.object({ action: z.literal("create"), object: recordType, view: fields }),
    z.object({ action: z.literal("update"), object: recordType, id: viewId, view: fields }),
    z.object({ action: z.literal("delete"), object: recordType, id: viewId }),
  ]))
  .handler(async ({ context, data }) => {
    const { entity, scope } = await directory(context, data.object);
    if (data.action === "create") {
      if (await entity.count(scope) >= 100) throw new Error("Remove an older saved view before creating a new one.");
      await entity.create({ ...scope, ...data.view });
      return { ok: true };
    }
    const query = { ...scope, id: data.id };
    if (await entity.count(query) !== 1) throw new Error("Saved view not found.");
    if (data.action === "update") await entity.updateMany(query, { $set: data.view });
    else await entity.deleteMany(query);
    return { ok: true };
  });
