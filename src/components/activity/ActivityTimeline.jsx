import SourceProperties from "@/components/layout/SourceProperties";
import ActivityAttachments from "@/components/activity/ActivityAttachments";
import { useCrmRegion } from "@/hooks/use-crm-region";
import { dateForRegion } from "@/lib/crm-regional";
import { CalendarDays, CheckSquare, Mail, Phone, RotateCcw, StickyNote } from "lucide-react";

const ICONS = {
  email: Mail,
  call: Phone,
  meeting: CalendarDays,
  note: StickyNote,
  task: CheckSquare,
  recovery: RotateCcw,
};

const TONES = {
  email: "bg-indigo-50 text-indigo-600",
  call: "bg-slate-100 text-slate-600",
  meeting: "bg-emerald-50 text-emerald-600",
  note: "bg-amber-50 text-amber-600",
  task: "bg-slate-100 text-slate-600",
  recovery: "bg-rose-50 text-rose-600",
};

export default function ActivityTimeline({ activities, emptyLabel = "No activity logged yet." }) {
  const region = useCrmRegion();
  if (!activities || activities.length === 0) {
    return <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-4">
      {activities.map((activity) => {
        const Icon = ICONS[activity.type] || StickyNote;
        return (
          <li key={activity.id} className="relative">
            <span
              className={`absolute -left-[27px] top-0 grid h-6 w-6 place-items-center rounded-full ring-4 ring-card ${
                TONES[activity.type] || TONES.note
              }`}
            >
              <Icon className="h-3 w-3" />
            </span>
            <p className="text-[13px] font-semibold leading-snug text-foreground">{activity.subject}</p>
            {activity.body && (
              <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{activity.body}</p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              {dateForRegion(activity.occurred_at, region, true)}
              {activity.owner ? ` · ${activity.owner}` : ""}
            </p>
            <ActivityAttachments activityId={activity.id} />
            <SourceProperties object="Activity" record={activity} />
          </li>
        );
      })}
    </ol>
  );
}