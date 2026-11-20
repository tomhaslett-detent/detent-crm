import { useCrmRegion } from "@/hooks/use-crm-region";
import { currencyTotals, moneyForRegion } from "@/lib/crm-regional";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import DealCard from "@/components/pipeline/DealCard";
import { STAGE_META } from "@/lib/crm";
import { cn } from "@/lib/utils";

export default function StageColumn({ stage, deals, onOpenDeal, draggable = true }) {
  const region = useCrmRegion();
  const meta = STAGE_META[stage];
  const totals = currencyTotals(deals);

  return (
    <section className="flex w-[270px] shrink-0 flex-col xl:w-auto xl:flex-1">
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot, meta.glow)} />
          <h3 className="truncate font-heading text-[13px] font-bold tracking-tight text-foreground">
            {meta.label}
          </h3>
          <span className="rounded-full bg-card px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
            {deals.length}
          </span>
        </div>
        <span className="font-heading text-right text-[13px] font-bold text-foreground">
          {totals.map(([currency, total]) => moneyForRegion(total, currency, region, true)).join(" · ") || "—"}
        </span>
      </header>

      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex flex-1 flex-col gap-2 rounded-xl border p-2 transition-colors duration-150 lg:max-h-[calc(100vh-300px)] lg:min-h-[440px] lg:overflow-y-auto [scrollbar-width:thin]",
              snapshot.isDraggingOver
                ? "border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-200"
                : "border-border bg-slate-100/60"
            )}
          >
            {deals.map((deal, index) => (
              <Draggable key={deal.id} draggableId={deal.id} index={index} isDragDisabled={!draggable}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <DealCard
                      deal={deal}
                      isDragging={dragSnapshot.isDragging}
                      onOpen={() => onOpenDeal(deal)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {deals.length === 0 && !snapshot.isDraggingOver && (
              <p className="py-8 text-center text-[11px] text-muted-foreground">Drop a deal here</p>
            )}
          </div>
        )}
      </Droppable>
    </section>
  );
}