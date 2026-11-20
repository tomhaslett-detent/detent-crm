import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { actorFor } from "@/lib/crm-access";
import { isDetentStaff } from "@/lib/crm-staff";
import { publishedGuides, searchGuides, suppliedGuides } from "@/lib/crm-help-content";

const asRows = (result) => Array.isArray(result) ? result : result?.items ?? [];
function deny() {
  setResponseStatus(403);
  throw new Error("You do not have access to this CRM feature.");
}

function staffEntities(context) {
  if (!isDetentStaff(context.user)) deny();
  return context.getBase44().asServiceRole.entities;
}

async function guideRows(entity) {
  return asRows(await entity.list("article_key", 250));
}

export const getCommandCentre = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const entities = staffEntities(context);
    const [accounts, contacts, deals, activities, activeMembers, importedCompanies, importedContacts, help] = await Promise.all([
      entities.Account.count(), entities.Contact.count(), entities.Deal.count(), entities.Activity.count(),
      entities.TeamInvite.count({ status: "active" }),
      entities.Account.count({ hubspot_source_key: { $regex: "^149444037:companies:" } }),
      entities.Contact.count({ hubspot_source_key: { $regex: "^149444037:contacts:" } }),
      guideRows(entities.CrmHelpArticle),
    ]);
    return { accounts, contacts, deals, activities, activeMembers, importedCompanies, importedContacts, guides: publishedGuides(help).length };
  });

export const getHelpLibrary = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const rows = await guideRows(staffEntities(context).CrmHelpArticle);
    const result = new Map(suppliedGuides.map((guide) => [guide.key, { article_key: guide.key, published: guide, enabled: true }]));
    for (const row of rows) result.set(row.article_key, row);
    return [...result.values()].map(({ article_key, draft, published, enabled }) => ({ article_key, draft, published, enabled }));
  });

const guideInput = z.object({ title: z.string().trim().min(1).max(140), category: z.string().trim().min(1).max(60), body: z.string().trim().min(30).max(20000) });

export const saveHelpGuide = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({
    key: z.string().regex(/^[a-z0-9-]{1,80}$/),
    action: z.enum(["draft", "publish", "unpublish"]),
    article: guideInput.optional(),
  }))
  .handler(async ({ context, data }) => {
    const entity = staffEntities(context).CrmHelpArticle;
    const found = asRows(await entity.filter({ article_key: data.key }, "id", 2));
    if (found.length > 1) throw new Error("This guide has duplicate records.");
    const row = found[0];
    const original = suppliedGuides.find(({ key }) => key === data.key);
    if (data.action !== "unpublish" && !data.article) throw new Error("Complete the guide fields.");
    if (data.action === "unpublish" && !row && !original) throw new Error("Guide not found.");
    const values = {
      article_key: data.key,
      draft: data.article ?? row?.draft ?? row?.published ?? original ?? {},
      published: data.action === "publish" ? data.article : row?.published ?? original ?? {},
      enabled: data.action === "publish" || (data.action !== "unpublish" && (row?.enabled ?? Boolean(original))),
    };
    if (data.action === "publish") values.published_at = new Date().toISOString();
    if (row) await entity.update(row.id, values);
    else {
      if (await entity.count() >= 200) throw new Error("The help library is full.");
      await entity.create(values);
    }
    return { ok: true };
  });

export const askCrmHelp = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ question: z.string().trim().min(3).max(400) }))
  .handler(async ({ context, data }) => {
    if (!await actorFor(context)) deny();
    const rows = await guideRows(context.getBase44().asServiceRole.entities.CrmHelpArticle);
    return { guides: searchGuides(publishedGuides(rows), data.question) };
  });
