import { useCrmRegion } from "@/hooks/use-crm-region";
import { moneyForRegion } from "@/lib/crm-regional";
import { STAGE_META, STAGE_ORDER } from "@/lib/crm";
import { cn } from "@/lib/utils";

export default function MobileStagePicker({ value, onChange, stats }) {
  const region = useCrmRegion();
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STAGE_ORDER.map((stage) => {
        const meta = STAGE_META[stage];
        const stageStats = stats[stage] || { count: 0, totals: [] };
        const active = value === stage;
        return (
          <button
            key={stage}
            onClick={() => onChange(stage)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-left transition-colors",
              active ? "border-transparent bg-frame text-white" : "border-border bg-card text-foreground"
            )}
          >
            <span className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
              <span className="text-xs font-semibold">{meta.label}</span>
              <span className={cn("text-[11px]", active ? "text-white/70" : "text-muted-foreground")}>
                {stageStats.count}
              </span>
            </span>
            <span className={cn("mt-0.5 block text-[11px] font-medium", active ? "text-white/70" : "text-muted-foreground")}>
              {stageStats.totals.map(([currency, total]) => moneyForRegion(total, currency, region, true)).join(" · ") || "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}