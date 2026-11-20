import { useCrmRegion } from "@/hooks/use-crm-region";
import { currencyTotals, moneyForRegion } from "@/lib/crm-regional";
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { endOfQuarter } from "date-fns";
import { Plus } from "lucide-react";
import DealDetailDrawer from "@/components/deals/DealDetailDrawer";
import DealFormDialog from "@/components/deals/DealFormDialog";
import PageHeader from "@/components/layout/PageHeader";
import PipelineBoard from "@/components/pipeline/PipelineBoard";
import PipelineFilters from "@/components/pipeline/PipelineFilters";
import StatStrip from "@/components/pipeline/StatStrip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCrmData } from "@/hooks/useCrmData";
import { useRelatedActivities } from "@/hooks/useRelatedActivities";
import { useAuth } from "@/lib/AuthContext";
import { useCrmCan } from "@/lib/crm-can";
import { OPEN_STAGES, nextStageOf } from "@/lib/crm";
import { logActivity, moveDealStage } from "@/lib/dealActions";

export const Route = createFileRoute("/_authed/")({
  head: () => ({
    meta: [
      { title: "Pipeline · Detent CRM" },
      { name: "description", content: "Live pipeline board for accounts, deals and recovery." },
    ],
  }),
  component: PipelinePage,
});

function filterDeals(deals, filters) {
  return deals.filter((deal) => {
    if (filters.owner !== "all" && deal.owner !== filters.owner) return false;
    if (filters.source !== "all" && deal.source !== filters.source) return false;
    if (filters.timeframe !== "all") {
      const closeDate = deal.close_date ? new Date(deal.close_date) : null;
      if (!closeDate) return false;
      const horizon =
        filters.timeframe === "quarter" ? endOfQuarter(new Date()) : new Date(Date.now() + Number(filters.timeframe) * 86400000);
      if (closeDate > horizon) return false;
    }
    return true;
  });
}

function PipelinePage() {
  const region = useCrmRegion();
  const { user } = useAuth();
  const can = useCrmCan();
  const { deals, accounts, contacts, loading, reload } = useCrmData();
  const [filters, setFilters] = useState({ owner: "all", source: "all", timeframe: "all" });
  const [selectedId, setSelectedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { reload: reloadActivities, ...activityState } = useRelatedActivities("deal_id", selectedId);

  const owners = useMemo(() => Array.from(new Set(deals.map((deal) => deal.owner).filter(Boolean))).sort(), [deals]);
  const visible = useMemo(() => filterDeals(deals, filters), [deals, filters]);
  const selectedDeal = deals.find((deal) => deal.id === selectedId) || null;

  const metrics = useMemo(() => {
    const open = visible.filter((deal) => OPEN_STAGES.includes(deal.stage));
    const totalsLabel = (records) => currencyTotals(records).map(([currency, total]) => moneyForRegion(total, currency, region, true)).join(" · ") || "—";
    const won = visible.filter((deal) => deal.stage === "closed_won");
    const lost = visible.filter((deal) => deal.stage === "closed_lost");
    const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
    const stagnant = open.filter(
      (deal) => deal.last_activity_date && (Date.now() - new Date(deal.last_activity_date)) / 86400000 >= 14
    );
    const recovery = visible.filter((deal) => deal.stage === "at_risk");

    return [
      {
        label: "Active pipeline",
        value: totalsLabel(open),
        hint: `${open.length} open deals`,
        dot: "bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.85)]",
      },
      {
        label: "Win rate",
        value: `${winRate}%`,
        hint: `${won.length} won · ${lost.length} lost`,
        dot: "bg-emerald-600 shadow-[0_0_10px_rgba(5,150,105,0.85)]",
      },
      {
        label: "Stagnant deals",
        value: String(stagnant.length),
        hint: "14+ days without a touch",
        dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.85)]",
      },
      {
        label: "Recovery ARR",
        value: totalsLabel(recovery),
        hint: "at risk, in recovery",
        dot: "bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.85)]",
      },
    ];
  }, [visible, region]);

  const changeStage = async (deal, stage) => {
    setSaving(true);
    try {
      await moveDealStage(deal, stage, user);
      await reload();
      await reloadActivities();
    } finally {
      setSaving(false);
    }
  };

  const advanceDeal = (deal) => {
    const next = nextStageOf(deal.stage);
    if (next) changeStage(deal, next);
  };

  const handleLogActivity = async (payload) => {
    if (!selectedDeal) return;
    setSaving(true);
    try {
      await logActivity({ deal: selectedDeal, ...payload }, user);
      await reload();
      await reloadActivities();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Detent CRM"
        title="Pipeline"
        actions={
          can.canCreate ? (
            <Button onClick={() => setFormOpen(true)} className="h-9">
              <Plus className="mr-1.5 h-4 w-4" /> New deal
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <PipelineFilters owners={owners} value={filters} onChange={setFilters} />
      </div>

      <StatStrip metrics={metrics} />

      {loading ? (
        <div className="grid gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[420px] rounded-xl" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <p className="font-heading text-lg font-bold text-foreground">Your pipeline is empty</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Create the first deal to start tracking value, velocity and recovery.
          </p>
          {can.canCreate && (
            <Button onClick={() => setFormOpen(true)} className="mt-4 h-9">
              <Plus className="mr-1.5 h-4 w-4" /> New deal
            </Button>
          )}
        </div>
      ) : (
        <PipelineBoard
          deals={visible}
          onStageChange={changeStage}
          onOpenDeal={(deal) => setSelectedId(deal.id)}
          onAdvance={can.canCreate ? advanceDeal : undefined}
          onAtRisk={can.canCreate ? (deal) => changeStage(deal, "at_risk") : undefined}
          draggable={can.canCreate}
        />
      )}

      <DealDetailDrawer
        deal={selectedDeal}
        open={Boolean(selectedDeal)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        {...activityState}
        onAdvance={() => selectedDeal && advanceDeal(selectedDeal)}
        onAtRisk={() => selectedDeal && changeStage(selectedDeal, "at_risk")}
        onWon={() => selectedDeal && changeStage(selectedDeal, "closed_won")}
        onLost={() => selectedDeal && changeStage(selectedDeal, "closed_lost")}
        onLogActivity={handleLogActivity}
        saving={saving}
        canEdit={can.canCreate}
        canLogActivity={can.canLogActivity}
      />

      <DealFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        accounts={accounts}
        contacts={contacts}
        onSaved={reload}
      />
    </div>
  );
}