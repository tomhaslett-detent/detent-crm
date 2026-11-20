import { cn } from "@/lib/utils";

export const ROLE_INFO = {
  revops: {
    label: "RevOps",
    blurb: "Sees every team and can edit, log and export anything. Cannot delete records or manage people.",
    pill: "bg-purple-50 text-purple-700",
  },
  manager: {
    label: "Sales manager",
    blurb: "Sees and edits every record inside their own team, and logs activity for the team.",
    pill: "bg-sky-50 text-sky-700",
  },
  rep: {
    label: "Sales rep",
    blurb: "Sees and edits only the records they own, plus the activity they log.",
    pill: "bg-emerald-50 text-emerald-700",
  },
  service: {
    label: "Service",
    blurb: "Reads their team's records and can log activity, without changing deals or accounts.",
    pill: "bg-amber-50 text-amber-700",
  },
  viewer: {
    label: "Read-only",
    blurb: "Reads their team's records. Cannot create, edit, delete or export anything.",
    pill: "bg-slate-100 text-slate-700",
  },
};

export default function RoleLegend() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Object.entries(ROLE_INFO).map(([key, role]) => (
        <div key={key} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-sm font-bold text-foreground">{role.label}</h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", role.pill)}>
              {key}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{role.blurb}</p>
        </div>
      ))}
      <div className="rounded-xl border border-dashed border-border bg-card p-4">
        <h3 className="font-heading text-sm font-bold text-foreground">CRM admin</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Workspace admins get every permission, plus inviting teammates, setting domains and deleting records.
        </p>
      </div>
    </div>
  );
}