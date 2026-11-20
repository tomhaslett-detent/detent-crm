import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-middleware";
import { mayAccess, roles } from "@/lib/crm-policy";

const ACTIONS = ["read", "create", "update", "delete"];

const SCOPES = {
  own: { team_key: "sales-eu", owner_email: "you@sales-eu.example" },
  teammate: { team_key: "sales-eu", owner_email: "peer@sales-eu.example" },
  otherTeam: { team_key: "sales-apac", owner_email: "peer@sales-apac.example" },
};

const actorFor = (role) => ({
  role,
  email: role === "admin" ? "admin@detent.example" : "you@sales-eu.example",
  team: "sales-eu",
});

// Runs the same mayAccess rules that guard every CRM request, once per role,
// so the access matrix can be verified against live code before data is imported.
export const runAccessAudit = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(({ context }) => {
    if (context.user.role !== "admin") {
      throw Object.assign(new Error("Only CRM admins can run the access check."), { status: 403 });
    }
    const rows = [];
    for (const role of ["admin", ...roles]) {
      const actor = actorFor(role);
      for (const action of ACTIONS) {
        const entry = { role, action, own: false, teammate: false, otherTeam: false };
        for (const [scope, record] of Object.entries(SCOPES)) {
          entry[scope] = mayAccess(actor, action, "Deal", record);
        }
        rows.push(entry);
      }
      rows.push({
        role,
        action: "export",
        own: mayAccess(actor, "export", "Deal", SCOPES.own),
        teammate: mayAccess(actor, "export", "Deal", SCOPES.teammate),
        otherTeam: mayAccess(actor, "export", "Deal", SCOPES.otherTeam),
      });
      rows.push({
        role,
        action: "log activity",
        own: mayAccess(actor, "create", "Activity", SCOPES.own),
        teammate: mayAccess(actor, "create", "Activity", SCOPES.teammate),
        otherTeam: mayAccess(actor, "create", "Activity", SCOPES.otherTeam),
      });
    }
    return { generated_at: new Date().toISOString(), roles: ["admin", ...roles], rows };
  });