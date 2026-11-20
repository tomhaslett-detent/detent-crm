import { useCrmRegion } from "@/hooks/use-crm-region";
import { moneyForRegion } from "@/lib/crm-regional";
import { ArrowRight, MoreHorizontal, TriangleAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials, velocityOf } from "@/lib/crm";
import { cn } from "@/lib/utils";

export default function DealCard({ deal, onOpen, onAdvance, onAtRisk, isDragging }) {
  const region = useCrmRegion();
  const velocity = velocityOf(deal);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group cursor-pointer rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md",
        isDragging && "rotate-[1deg] shadow-xl ring-2 ring-indigo-400"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-100 font-heading text-[11px] font-bold text-slate-600">
          {initials(deal.account_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {deal.account_name}
          </p>
          <p className="truncate font-heading text-[13px] font-semibold leading-snug text-foreground">
            {deal.title}
          </p>
        </div>
        <p className="shrink-0 font-heading text-[15px] font-bold leading-none text-foreground">
          {moneyForRegion(deal.value, deal.currency, region, true)}
        </p>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", velocity.dot)} />
          <span className={cn("truncate text-[11px] font-medium", velocity.text)}>{velocity.label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="max-w-[76px] truncate text-[11px] text-muted-foreground">{deal.owner}</span>
          <span onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Deal actions"
                  className="grid h-6 w-6 place-items-center rounded text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onOpen}>Open deal</DropdownMenuItem>
                {onAdvance && (
                  <DropdownMenuItem onClick={() => onAdvance(deal)}>
                    <ArrowRight className="mr-2 h-3.5 w-3.5" /> Advance stage
                  </DropdownMenuItem>
                )}
                {onAtRisk && (
                  <DropdownMenuItem onClick={() => onAtRisk(deal)}>
                    <TriangleAlert className="mr-2 h-3.5 w-3.5" /> Mark at risk
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </span>
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-all", velocity.bar, velocity.width)} />
      </div>
    </div>
  );
}