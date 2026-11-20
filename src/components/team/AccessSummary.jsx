import { useAuth } from "@/lib/AuthContext";
import { useEffectiveCrmActor } from "@/lib/use-effective-crm-actor";

const LABELS = {
  revops: "RevOps",
  manager: "Sales manager",
  rep: "Sales rep",
  service: "Service",
  viewer: "Read-only",
};

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default function AccessSummary() {
  const { user } = useAuth();
  const actor = useEffectiveCrmActor();
  const isAdmin = user?.role === "admin";
  const role = isAdmin ? "CRM admin" : actor ? LABELS[actor.role] || actor.role : "Checking…";

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-heading text-sm font-bold text-foreground">Your access</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="Signed in as" value={user?.email || "—"} />
        <Field label="Role" value={role} />
        <Field label="Team" value={isAdmin ? "All teams" : actor?.team || "—"} />
      </dl>
      {!isAdmin && !actor && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          This work email is not on the CRM access list yet, so records stay hidden. Ask a CRM admin to invite it.
        </p>
      )}
    </section>
  );
}