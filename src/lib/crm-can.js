import { mayAccess } from "@/lib/crm-policy";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveCrmActor } from "@/lib/use-effective-crm-actor";

const scopeOf = (actor) => ({ team_key: actor?.team || "", owner_email: actor?.email || "" });

// Client-side mirror of the server rules, used only to hide actions the server
// would reject. crmRequest stays the enforcement point.
export function useCrmCan() {
  const { user } = useAuth();
  const actor = useEffectiveCrmActor();
  const isAdmin = user?.role === "admin";
  const sample = scopeOf(actor);

  return {
    actor,
    role: isAdmin ? "admin" : actor?.role || null,
    isAdmin,
    canCreate: isAdmin || mayAccess(actor, "create", "Deal", sample),
    canCreateAccount: isAdmin || mayAccess(actor, "create", "Account", sample),
    canCreateContact: isAdmin || mayAccess(actor, "create", "Contact", sample),
    canLogActivity: isAdmin || mayAccess(actor, "create", "Activity", sample),
    canExport: isAdmin || mayAccess(actor, "export", "Deal", sample),
    canEdit: (record) => isAdmin || mayAccess(actor, "update", "Deal", record),
  };
}