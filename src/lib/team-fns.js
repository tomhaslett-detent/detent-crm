import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { roles } from "@/lib/crm-policy";

const rows = (value) => Array.isArray(value) ? value : value?.items ?? [];

function adminClient(context) {
  if (context.user.role !== "admin") throw new Error("CRM admin access required");
  return context.getBase44();
}

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => rows(await adminClient(context).entities.TeamInvite.list("-created_date", 500)));

export const manageMember = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({
    action: z.enum(["invite", "update", "revoke"]),
    email: z.string().trim().email().max(200),
    role: z.enum(roles).optional(),
    team: z.string().trim().min(1).max(60).regex(/^[a-zA-Z0-9 -]+$/).optional(),
  }))
  .handler(async ({ context, data }) => {
    const base44 = adminClient(context);
    const email = data.email.toLowerCase();
    const settings = rows(await base44.entities.CrmSettings.list("-updated_date", 1))[0];
    const domain = (settings?.company_domain || "detentgtm.io").trim().toLowerCase();
    if (data.action === "invite" && !email.endsWith("@" + domain)) throw new Error("Use a work email at " + domain);
    const entity = base44.entities.TeamInvite;
    const existing = rows(await entity.filter({ email }, "-created_date", 2));
    if (existing.length > 1) throw new Error("Resolve duplicate membership records before proceeding.");
    const [member] = existing;
    if (data.action === "revoke") {
      if (!member) throw new Error("No membership found");
      await entity.update(member.id, { status: "revoked" });
      return { ok: true };
    }
    if (!data.role || !data.team) throw new Error("Choose a role and enter a team.");
    const values = { crm_role: data.role, crm_team: data.team.toLowerCase(), status: "active" };
    if (data.action === "update") {
      if (member?.status !== "active") throw new Error("Invite the member first.");
      await entity.update(member.id, values);
      return { ok: true };
    }
    await base44.users.inviteUser(email, "user");
    if (member) await entity.update(member.id, values);
    else await entity.create({ email, ...values, invited_by: context.user.email });
    return { ok: true };
  });