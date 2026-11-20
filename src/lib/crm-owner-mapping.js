import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { isDetentStaff } from "@/lib/crm-staff";
import { roles } from "@/lib/crm-policy";

const rows = (value) => Array.isArray(value) ? value : value?.items ?? [];
const input = z.object({
  object: z.enum(["Account", "Contact", "Deal"]),
  ownerLabel: z.string().trim().min(1).max(200),
  memberId: z.string().min(1).max(100).optional(),
  expectedCount: z.number().int().min(1).optional(),
});
const sourceTypes = {
  Account: ["companies", "company owner"],
  Contact: ["contacts", "contact owner"],
  Deal: ["deals", "deal owner", "Deal owner"],
};

function staff(context) {
  if (!isDetentStaff(context.user)) throw new Error("Detent staff access required.");
  return context.getBase44().asServiceRole.entities;
}

function ownerFilter(object, ownerLabel) {
  const [kind, ...fields] = sourceTypes[object];
  return {
    hubspot_source_key: { $regex: "^149444037:" + kind + ":" },
    $and: [
      { $or: fields.map((field) => ({ ["hubspot_source_fields." + field]: ownerLabel })) },
      { $or: [{ owner_email: { $exists: false } }, { owner_email: null }, { owner_email: "" }] },
      { $or: [{ team_key: { $exists: false } }, { team_key: null }, { team_key: "" }] },
    ],
  };
}

function validMember(member) {
  return member?.status === "active" && roles.includes(member.crm_role) &&
    typeof member.email === "string" && member.email.includes("@") && Boolean(member.crm_team?.trim());
}

export const ownershipOptions = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const result = await staff(context).TeamInvite.filter({ status: "active" }, "email", 500, 0, ["id", "email", "crm_team", "crm_role", "status"]);
    return { members: rows(result).filter(validMember).map(({ id, email, crm_team }) => ({ id, email, team: crm_team })) };
  });

export const previewOwnership = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(input)
  .handler(async ({ context, data }) => {
    const entities = staff(context);
    const count = await entities[data.object].count(ownerFilter(data.object, data.ownerLabel));
    return { count };
  });

export const assignImportedOwnership = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(input.required({ memberId: true, expectedCount: true }))
  .handler(async ({ context, data }) => {
    const entities = staff(context);
    const member = await entities.TeamInvite.get(data.memberId);
    if (!validMember(member)) throw new Error("Select an active CRM member with a team.");
    const email = member.email.trim().toLowerCase();
    const matches = rows(await entities.TeamInvite.filter({ email }, "id", 2));
    if (matches.length !== 1 || matches[0].id !== member.id) throw new Error("The member has conflicting membership records.");
    const entity = entities[data.object];
    const filter = ownerFilter(data.object, data.ownerLabel);
    if (await entity.count(filter) !== data.expectedCount) throw new Error("Eligible records changed. Preview again before assigning.");
    const batch = rows(await entity.filter(filter, "id", 250, 0, ["id"]));
    if (!batch.length) throw new Error("No eligible records remain.");
    const ids = batch.map(({ id }) => id);
    const target = { owner_email: email, team_key: member.crm_team, owner: email };
    const result = await entity.updateMany({ $and: [filter, { id: { $in: ids } }] }, { $set: target });
    const [verified, remaining] = await Promise.all([
      entity.count({ id: { $in: ids }, ...target }),
      entity.count(filter),
    ]);
    if (result.updated !== ids.length || verified !== ids.length) throw new Error("The assignment changed during the batch. Run a new preview.");
    return { verified, remaining };
  });
