import { currencyTotals } from "@/lib/crm-regional";
import { useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import StageColumn from "@/components/pipeline/StageColumn";
import MobileStagePicker from "@/components/pipeline/MobileStagePicker";
import DealCard from "@/components/pipeline/DealCard";
import { STAGE_ORDER } from "@/lib/crm";
import { useIsMobile } from "@/hooks/use-mobile";

export default function PipelineBoard({ deals, onStageChange, onOpenDeal, onAdvance, onAtRisk, draggable = true }) {
  const isMobile = useIsMobile();
  const [activeStage, setActiveStage] = useState("prospect");

  const byStage = (stage) => deals.filter((deal) => deal.stage === stage);

  if (isMobile) {
    const stats = {};
    STAGE_ORDER.forEach((stage) => {
      const list = byStage(stage);
      stats[stage] = {
        count: list.length,
        totals: currencyTotals(list),
      };
    });
    const stageDeals = byStage(activeStage);

    return (
      <div>
        <MobileStagePicker value={activeStage} onChange={setActiveStage} stats={stats} />
        <div className="mt-3 space-y-2">
          {stageDeals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onOpen={() => onOpenDeal(deal)}
              onAdvance={onAdvance}
              onAtRisk={onAtRisk}
            />
          ))}
          {stageDeals.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card py-12 text-center">
              <p className="text-sm font-medium text-foreground">No deals in this stage</p>
              <p className="mt-1 text-xs text-muted-foreground">Advance a deal or log a new one.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleDragEnd = (result) => {
    if (!draggable) return;
    const { draggableId, source, destination } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const deal = deals.find((item) => item.id === draggableId);
    if (deal) onStageChange(deal, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {STAGE_ORDER.map((stage) => (
          <StageColumn key={stage} stage={stage} deals={byStage(stage)} onOpenDeal={onOpenDeal} draggable={draggable} />
        ))}
      </div>
    </DragDropContext>
  );
}