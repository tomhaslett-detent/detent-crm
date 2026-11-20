import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useCrmPage } from "@/hooks/useCrmPage";
import RecordPagination from "@/components/layout/RecordPagination";
import ActivityTimeline from "@/components/activity/ActivityTimeline";
import LogActivityForm from "@/components/activity/LogActivityForm";
import PageHeader from "@/components/layout/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCrmData } from "@/hooks/useCrmData";
import { useAuth } from "@/lib/AuthContext";
import { useCrmCan } from "@/lib/crm-can";
import { ACTIVITY_TYPES } from "@/lib/crm";
import { logActivity } from "@/lib/dealActions";

export const Route = createFileRoute("/_authed/activity")({
  head: () => ({ meta: [{ title: "Activity · Detent CRM" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const { user } = useAuth();
  const can = useCrmCan();
  const { deals } = useCrmData();
  const [type, setType] = useState("all");
  return <ActivityWithFilter key={type} {...{ user, can, deals, type, setType }} />;
}

function ActivityWithFilter({ user, can, deals, type, setType }) {
  const directory = useCrmPage("Activity", type === "all" ? undefined : type);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const handleLog = async (payload) => {
    setSaving(true);
    setSaveError("");
    try {
      const deal = deals.find((item) => item.id === payload.deal_id);
      await logActivity({ deal, ...payload }, user);
      await directory.reload();
    } catch {
      setSaveError("Could not complete the activity update. Reload the timeline before retrying.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Detent CRM"
        title="Activity"
        description="Every touch across deals, accounts and recovery."
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {can.canLogActivity ? (
            <LogActivityForm onSubmit={handleLog} submitting={saving} deals={deals} />
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
              Your role is read-only for activity. Ask a CRM admin if you need to log touches.
            </p>
          )}
          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Filter by type
            </p>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All activity</SelectItem>
                {ACTIVITY_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-4 font-heading text-sm font-bold text-foreground">
            Timeline · {directory.total} entries
          </h2>
          {directory.error ? <p role="alert">Could not load activity. <button type="button" className="underline" onClick={() => directory.reload()}>Retry</button></p> : directory.loading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : (
            <ActivityTimeline activities={directory.records} emptyLabel="No activity logged for this filter yet." />
          )}
          <RecordPagination {...directory} />
        </div>
      </div>
    </div>
  );
}