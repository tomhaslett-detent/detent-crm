import { useRelatedActivities } from "@/hooks/useRelatedActivities";
import { useCrmRegion } from "@/hooks/use-crm-region";
import { moneyForRegion } from "@/lib/crm-regional";
import SourceProperties from "@/components/layout/SourceProperties";
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";
import { crmEntities } from "@/lib/crm-client";
import AccountForm from "@/components/accounts/AccountForm";
import ActivityTimeline from "@/components/activity/ActivityTimeline";
import LogActivityForm from "@/components/activity/LogActivityForm";
import FormDialog from "@/components/forms/FormDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthContext";
import { STAGE_META, initials, rows } from "@/lib/crm";
import { logActivity } from "@/lib/dealActions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/accounts/$accountId")({
  head: () => ({ meta: [{ title: "Account · Detent CRM" }] }),
  component: AccountDetailPage,
});

const HEALTH = {
  healthy: { label: "Healthy", pill: "bg-emerald-50 text-emerald-700" },
  watch: { label: "Watch", pill: "bg-amber-50 text-amber-700" },
  at_risk: { label: "At risk", pill: "bg-rose-50 text-rose-700" },
};

function AccountDetailPage() {
  const region = useCrmRegion();
  const { accountId } = Route.useParams();
  const { user } = useAuth();
  const [account, setAccount] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const { activities, loadOlderActivities, activitiesLoading, activitiesError, reload: reloadActivities } = useRelatedActivities("account_id", accountId);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [record, contactPage, dealPage] = await Promise.all([
        crmEntities.Account.get(accountId),
        crmEntities.Contact.filter({ account_id: accountId }, { sort: "first_name", limit: 100 }),
        crmEntities.Deal.filter({ account_id: accountId }, { sort: "-updated_date", limit: 100 }),
      ]);
      setAccount(record);
      setContacts(rows(contactPage));
      setDeals(rows(dealPage));
    } catch (err) {
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (payload) => {
    setSaving(true);
    setError("");
    try {
      await crmEntities.Account.update(accountId, payload);
      await load();
      setEditing(false);
    } catch (err) {
      setError(err?.message || "Could not save the account.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogActivity = async (payload) => {
    setSaving(true);
    try {
      await logActivity({ account, ...payload }, user);
      await Promise.all([load(), reloadActivities()]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-72 rounded-xl" />;
  }

  if (missing || !account) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <p className="font-heading text-lg font-bold text-foreground">Account not found</p>
        <p className="mt-1 text-sm text-muted-foreground">It may have been deleted, or you may not have access.</p>
        <Button asChild variant="outline" className="mt-4 h-9">
          <Link to="/accounts">Back to accounts</Link>
        </Button>
      </div>
    );
  }

  const health = HEALTH[account.health] || HEALTH.healthy;

  return (
    <div className="space-y-4">
      <Link to="/accounts" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Accounts
      </Link>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 font-heading text-sm font-bold text-slate-600">
              {initials(account.name)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl font-extrabold tracking-tight text-foreground">{account.name}</h1>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", health.pill)}>
                  {health.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[account.domain, account.industry, account.region].filter(Boolean).join(" · ") || "No details yet"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Owner</p>
            <p className="text-[13px] font-medium text-foreground">{account.owner || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">ARR</p>
            <p className="text-[13px] font-medium text-foreground">{moneyForRegion(account.arr, "EUR", region)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Employees</p>
            <p className="text-[13px] font-medium text-foreground">{account.employees || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Open deals</p>
            <p className="text-[13px] font-medium text-foreground">{deals.length}</p>
          </div>
        </div>

        {account.notes && (
          <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-muted-foreground">
            {account.notes}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-heading text-sm font-bold text-foreground">Deals</h2>
          <div className="space-y-2">
            {deals.map((deal) => {
              const meta = STAGE_META[deal.stage] || STAGE_META.prospect;
              return (
                <div key={deal.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-heading text-[13px] font-semibold text-foreground">{deal.title}</p>
                    <span className={cn("mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold", meta.pill)}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="shrink-0 font-heading text-[13px] font-bold text-foreground">
                    {moneyForRegion(deal.value, deal.currency, region)}
                  </p>
                </div>
              );
            })}
            {deals.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No deals yet.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-heading text-sm font-bold text-foreground">Contacts</h2>
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-lg border border-border p-2.5">
                <p className="font-heading text-[13px] font-semibold text-foreground">
                  {`${contact.first_name} ${contact.last_name || ""}`.trim()}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {[contact.title, contact.email].filter(Boolean).join(" · ") || "No details"}
                </p>
              </div>
            ))}
            {contacts.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No contacts yet.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-heading text-sm font-bold text-foreground">Activity</h2>
        <LogActivityForm onSubmit={handleLogActivity} submitting={saving} />
        <div className="mt-4">
          {activitiesError && <p role="alert" className="text-xs">Could not load company activity.</p>}
          {(activities.length > 0 || (!activitiesLoading && !activitiesError)) && <ActivityTimeline activities={activities} />}
          {activitiesLoading && <p role="status" className="text-xs">Loading activity…</p>}
          {loadOlderActivities && <Button type="button" size="sm" variant="outline" disabled={activitiesLoading} onClick={loadOlderActivities}>
            Load older activity
          </Button>}
        </div>
      </div>

      <SourceProperties object="Account" record={account} />

      <FormDialog open={editing} onOpenChange={setEditing} title="Edit account">
        <AccountForm initial={account} onSubmit={handleSave} submitting={saving} error={error} />
      </FormDialog>
    </div>
  );
}