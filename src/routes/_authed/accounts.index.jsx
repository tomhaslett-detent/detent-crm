import SavedDirectoryViews from "@/components/layout/SavedDirectoryViews";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { crmEntities } from "@/lib/crm-client";
import AccountForm from "@/components/accounts/AccountForm";
import FormDialog from "@/components/forms/FormDialog";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCrmPage } from "@/hooks/useCrmPage";
import RecordPagination from "@/components/layout/RecordPagination";
import { useCrmCan } from "@/lib/crm-can";
import { initials } from "@/lib/crm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/accounts/")({
  head: () => ({ meta: [{ title: "Accounts · Detent CRM" }] }),
  component: AccountsPage,
});

const HEALTH = {
  healthy: { label: "Healthy", dot: "bg-emerald-600", pill: "bg-emerald-50 text-emerald-700" },
  watch: { label: "Watch", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700" },
  at_risk: { label: "At risk", dot: "bg-rose-600", pill: "bg-rose-50 text-rose-700" },
};

function AccountsPage() {
  const can = useCrmCan();
  const directory = useCrmPage("Account");
  const { search, changeSearch, records: cards, total, loading, reload } = directory;
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (payload) => {
    setSubmitting(true);
    setError("");
    try {
      await crmEntities.Account.create(payload);
      await reload();
      setFormOpen(false);
    } catch (err) {
      setError(err?.message || "Could not save the account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Detent CRM"
        title="Accounts"
        description={`${total} companies in the module`}
        actions={
          can.canCreateAccount ? (
            <Button onClick={() => setFormOpen(true)} className="h-9">
              <Plus className="mr-1.5 h-4 w-4" /> New account
            </Button>
          ) : null
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          maxLength={100}
          onChange={(event) => changeSearch(event.target.value)}
          placeholder="Search accounts"
          className="h-9 pl-8 text-sm"
        />
      </div>

      <SavedDirectoryViews object="Account" search={search} onSearchChange={changeSearch} />

      {directory.error ? <p role="alert">Could not load accounts. Try your search again.</p> : loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((account) => {
            const health = HEALTH[account.health] || HEALTH.healthy;
            return (
              <Link
                key={account.id}
                to="/accounts/$accountId"
                params={{ accountId: account.id }}
                className="rounded-xl border border-border bg-card p-4 transition-all hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 font-heading text-xs font-bold text-slate-600">
                    {initials(account.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-sm font-bold text-foreground">{account.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {account.domain || account.industry || "—"}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", health.pill)}>
                    {health.label}
                  </span>
                </div>
              </Link>
            );
          })}
          {cards.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground">
              {search ? "No matching accounts." : "No accounts yet."}
            </p>
          )}
        </div>
      )}

      <RecordPagination {...directory} />

      <FormDialog open={formOpen} onOpenChange={setFormOpen} title="New account" description="Group deals, contacts and activity under one company.">
        <AccountForm onSubmit={handleCreate} submitting={submitting} error={error} />
      </FormDialog>
    </div>
  );
}