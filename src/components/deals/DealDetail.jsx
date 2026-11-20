import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/AuthContext";
import { getDealAssociations } from "@/lib/crm-access";
import SourceProperties from "@/components/layout/SourceProperties";
import { useCrmRegion } from "@/hooks/use-crm-region";
import { moneyForRegion, dateForRegion } from "@/lib/crm-regional";
import { ArrowRight, CheckCircle2, TriangleAlert, XCircle } from "lucide-react";
import ActivityTimeline from "@/components/activity/ActivityTimeline";
import LogActivityForm from "@/components/activity/LogActivityForm";
import { Button } from "@/components/ui/button";
import { initials, STAGE_META, velocityOf } from "@/lib/crm";
import { cn } from "@/lib/utils";

function MetaRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function DealAssociations({ deal }) {
  const { user } = useAuth();
  const { data, isPending, isError } = useQuery({
    queryKey: ["crm-deal-associations", user?.id, deal.id, deal.updated_date],
    queryFn: () => getDealAssociations({ data: { id: deal.id } }),
    enabled: Boolean(user?.id),
    retry: false,
    gcTime: 0,
  });

  return (
    <section className="space-y-2">
      <h3 className="font-heading text-[13px] font-bold">Linked companies and contacts</h3>
      {isPending && <p role="status" className="text-xs">Loading links…</p>}
      {isError && <p role="alert" className="text-xs">Could not load deal links.</p>}
      {data && (data.Account.length || data.Contact.length ? (
        <ul className="space-y-1 text-xs">
          {data.Account.map(({ id, label, primary }) => (
            <li key={id}>Company · <Link to="/accounts/$accountId" params={{ accountId: id }} className="underline">{label}</Link>{primary && " (Primary)"}</li>
          ))}
          {data.Contact.map(({ id, label, primary }) => (
            <li key={id}>Contact · {label}{primary && " (Primary)"}</li>
          ))}
        </ul>
      ) : <p className="text-xs text-muted-foreground">No linked records are available.</p>)}
    </section>
  );
}

export default function DealDetail({
  deal,
  activities = [],
  loadOlderActivities,
  activitiesLoading,
  activitiesError,
  onAdvance,
  onAtRisk,
  onWon,
  onLost,
  onLogActivity,
  saving,
  canEdit = true,
  canLogActivity = true,
}) {
  const region = useCrmRegion();
  const meta = STAGE_META[deal.stage] || STAGE_META.prospect;
  const velocity = velocityOf(deal);

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border bg-card px-5 pb-4 pt-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 font-heading text-xs font-bold text-slate-600">
            {initials(deal.account_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {deal.account_name}
            </p>
            <h2 className="font-heading text-lg font-bold leading-tight tracking-tight text-foreground">
              {deal.title}
            </h2>
          </div>
        </div>
        <div className="mt-3 empty:hidden">
          <SourceProperties object="Deal" record={deal} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.pill)}>{meta.label}</span>
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            {moneyForRegion(deal.value, deal.currency, region)}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", velocity.dot)} />
          <span className={cn("text-[11px] font-medium", velocity.text)}>{velocity.label}</span>
          <span className="ml-auto text-[11px] text-muted-foreground">Close {dateForRegion(deal.close_date, region)}</span>
        </div>
      </div>

      <div className="space-y-5 px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <MetaRow label="Owner" value={deal.owner} />
          <MetaRow label="Primary contact" value={deal.contact_name} />
          <MetaRow label="Source" value={deal.source ? deal.source[0].toUpperCase() + deal.source.slice(1) : ""} />
          <MetaRow label="Probability" value={deal.probability ? `${deal.probability}%` : ""} />
          <div className="col-span-2">
            <MetaRow label="Next step" value={deal.next_step} />
          </div>
        </div>

        <DealAssociations deal={deal} />

        {canEdit && (
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={onAdvance} disabled={saving}>
              <ArrowRight className="mr-1.5 h-3.5 w-3.5" /> Advance
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={onAtRisk} disabled={saving}>
              <TriangleAlert className="mr-1.5 h-3.5 w-3.5" /> At risk
            </Button>
            <Button
              size="sm"
              className="h-9 bg-success text-xs text-success-foreground hover:bg-success/90"
              onClick={onWon}
              disabled={saving}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Won
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={onLost} disabled={saving}>
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> Lost
            </Button>
          </div>
        )}

        {canLogActivity && (
          <div>
            <h3 className="mb-2 font-heading text-[13px] font-bold tracking-tight text-foreground">Log activity</h3>
            <LogActivityForm onSubmit={onLogActivity} submitting={saving} />
          </div>
        )}

        <div>
          <h3 className="mb-3 font-heading text-[13px] font-bold tracking-tight text-foreground">Activity timeline</h3>
          {activitiesError && <p role="alert" className="text-xs">Could not load deal activity.</p>}
          {(activities.length > 0 || (!activitiesLoading && !activitiesError)) && <ActivityTimeline activities={activities} />}
          {activitiesLoading && <p role="status" className="text-xs">Loading activity…</p>}
          {loadOlderActivities && <Button type="button" size="sm" variant="outline" disabled={activitiesLoading} onClick={loadOlderActivities}>
            Load older activity
          </Button>}
        </div>
      </div>
    </div>
  );
}