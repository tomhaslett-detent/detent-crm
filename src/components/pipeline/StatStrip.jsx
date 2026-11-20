import { cn } from "@/lib/utils";

export default function StatStrip({ metrics }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse-dot", metric.dot)} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {metric.label}
            </span>
          </div>
          <p className="mt-1.5 font-heading text-[26px] font-bold leading-none tracking-tight text-foreground lg:text-[32px]">
            {metric.value}
          </p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{metric.hint}</p>
        </div>
      ))}
    </div>
  );
}