import { sourceRecordId } from "@/lib/crm-search";
import { useQuery } from "@tanstack/react-query";
import { crmEntities } from "@/lib/crm-client";
import { useCrmRegion } from "@/hooks/use-crm-region";
import { moneyForRegion, dateForRegion } from "@/lib/crm-regional";
import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import DealCard from "@/components/pipeline/DealCard";
import DealDetailDrawer from "@/components/deals/DealDetailDrawer";
import DealFormDialog from "@/components/deals/DealFormDialog";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCrmData } from "@/hooks/useCrmData";
import { useRelatedActivities } from "@/hooks/useRelatedActivities";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/AuthContext";
import { useCrmCan } from "@/lib/crm-can";
import { STAGE_META, STAGE_ORDER, nextStageOf, velocityOf } from "@/lib/crm";
import { logActivity, moveDealStage } from "@/lib/dealActions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/deals")({
  validateSearch: (search) => ({ create: search.create }),
  head: () => ({ meta: [{ title: "Deals · Detent CRM" }] }),
  component: DealsPage,
});

function DealsPage() {
  const region = useCrmRegion();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const can = useCrmCan();
  const { deals, accounts, contacts, loading, reload } = useCrmData();

  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [owner, setOwner] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const formOpen = Boolean(search.create) || manualOpen;
  const setFormOpen = (next) => {
    setManualOpen(next);
    if (!next && search.create) navigate({ to: "/deals", search: {}, replace: true });
  };

  const { reload: reloadActivities, ...activityState } = useRelatedActivities("deal_id", selectedId);

  const sourceSearch = user?.role === "admin" && Boolean(sourceRecordId(query));
  const sourceLookup = useQuery({
    queryKey: ["crm-deal-source-lookup", user?.id, query.trim()],
    queryFn: () => crmEntities.Deal.page(query.trim(), 100),
    enabled: sourceSearch,
    retry: false,
    gcTime: 0,
  });
  const candidates = sourceSearch ? sourceLookup.data?.records ?? [] : deals;

  const owners = useMemo(() => Array.from(new Set(deals.map((deal) => deal.owner).filter(Boolean))).sort(), [deals]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return candidates.filter((deal) => {
      if (stage !== "all" && deal.stage !== stage) return false;
      if (owner !== "all" && deal.owner !== owner) return false;
      if (!term || sourceSearch) return true;
      return [deal.title, deal.account_name, deal.contact_name, deal.owner]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(term));
    });
  }, [candidates, query, stage, owner, sourceSearch]);

  const selectedDeal = candidates.find((deal) => deal.id === selectedId) || deals.find((deal) => deal.id === selectedId) || null;

  const changeStage = async (deal, nextStage) => {
    setSaving(true);
    try {
      await moveDealStage(deal, nextStage, user);
      await reload();
      if (sourceSearch) await sourceLookup.refetch();
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
      if (sourceSearch) await sourceLookup.refetch();
      await reloadActivities();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Detent CRM"
        title="Deals"
        description={sourceSearch ? `${visible.length} of ${sourceLookup.data?.total ?? 0} source ID matches` : `${visible.length} of ${deals.length} deals`}
        actions={
          can.canCreate ? (
            <Button onClick={() => setFormOpen(true)} className="h-9">
              <Plus className="mr-1.5 h-4 w-4" /> New deal
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={user?.role === "admin" ? "Search deals or enter id:123" : "Search deals, accounts or owners"}
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-auto">
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-9 text-xs sm:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {[...STAGE_ORDER, "closed_lost"].map((option) => (
                <SelectItem key={option} value={option}>
                  {STAGE_META[option].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="h-9 text-xs sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {owners.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {sourceSearch && sourceLookup.isError && <p role="alert">Could not look up the source ID.</p>}
      {(sourceSearch ? sourceLookup.isPending : loading) ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : isMobile ? (
        <div className="space-y-2">
          {visible.map((deal) => (
            <DealCard key={deal.id} deal={deal} onOpen={() => setSelectedId(deal.id)} />
          ))}
          {visible.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground">
              No deals match these filters.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="text-[11px] uppercase tracking-wide">Deal</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Stage</TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-wide">Value</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Owner</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Close</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Velocity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((deal) => {
                const velocity = velocityOf(deal);
                const meta = STAGE_META[deal.stage] || STAGE_META.prospect;
                return (
                  <TableRow
                    key={deal.id}
                    onClick={() => setSelectedId(deal.id)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <TableCell>
                      <p className="font-heading text-[13px] font-semibold text-foreground">{deal.title}</p>
                      <p className="text-[11px] text-muted-foreground">{deal.account_name || "No account"}</p>
                    </TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.pill)}>
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-heading text-[13px] font-bold">
                      {moneyForRegion(deal.value, deal.currency, region)}
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">{deal.owner || "—"}</TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">{dateForRegion(deal.close_date, region)}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", velocity.dot)} />
                        <span className={cn("text-[11px] font-medium", velocity.text)}>{velocity.label}</span>
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No deals match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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