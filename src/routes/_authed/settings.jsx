import RegionalSettings from "@/components/layout/RegionalSettings";
import HubSpotDealImport from "@/components/layout/HubSpotDealImport";
import HubSpotActivityImport from "@/components/layout/HubSpotActivityImport";
import HubSpotCsvImport from "@/components/layout/HubSpotCsvImport";
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { crmEntities } from "@/lib/crm-client";
import PageHeader from "@/components/layout/PageHeader";
import { STAGE_META, STAGE_ORDER } from "@/lib/crm";
import { exportScopedCrm } from "@/lib/crm-access";
import { useEffectiveCrmActor } from "@/lib/use-effective-crm-actor";

import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/settings")({
  head: () => ({ meta: [{ title: "Settings · Detent CRM" }] }),
  component: SettingsPage,
});

const OBJECTS = [
  { key: "Account", label: "Accounts", description: "Companies, health and ownership" },
  { key: "Contact", label: "Contacts", description: "Buying committee and roles" },
  { key: "Deal", label: "Deals", description: "Value, stage and velocity" },
  { key: "Activity", label: "Activity", description: "Every touch and recovery trigger" },
];

function SettingsPage() {
  const { user } = useAuth();
  const actor = useEffectiveCrmActor();
  const [counts, setCounts] = useState({});
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function downloadExport() {
    setExporting(true);
    setExportError("");
    try {
      const data = await exportScopedCrm();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `detent-crm-${data.exported_at.slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError("The export could not be downloaded. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    Promise.all(OBJECTS.map((object) => crmEntities[object.key].count({}))).then((values) => {
      const next = {};
      OBJECTS.forEach((object, index) => {
        next[object.key] = values[index];
      });
      setCounts(next);
    }).catch(() => setCounts({}));
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Detent CRM"
        title="Settings"
        description="Manage your regional preferences and CRM workspace."
      />

      <RegionalSettings />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-bold text-foreground">CRM module</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Standalone development workspace
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
Development
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Manage your sales records in this workspace. Integration with the GTM OS is a future step.
        </p>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="font-heading text-sm font-bold text-foreground">Team access</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Invitations, roles and teams live on their own page.
          </p>
        </div>
        <Link to="/team" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          Manage team access
        </Link>
      </section>
      {(user?.role === "admin" || actor?.role === "revops") && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading text-sm font-bold">CRM data export</h2>
          <p className="my-2 text-sm text-muted-foreground">
            Download accounts, contacts, deals and activities as JSON, including record links. Pause edits for a
            consistent handoff and store the file securely. To move data from HubSpot, use a separate migration.
          </p>
          <button type="button" onClick={downloadExport} disabled={exporting}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {exporting ? "Preparing export…" : "Download CRM export"}
          </button>
          {exportError && <p role="alert" className="mt-2 text-sm text-destructive">{exportError}</p>}
        </section>
      )}

      {user?.role === "admin" && <HubSpotCsvImport />}
      {user?.role === "admin" && <HubSpotDealImport />}
      {user?.role === "admin" && <HubSpotActivityImport />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {OBJECTS.map((object) => (
          <div key={object.key} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {object.label}
            </p>
            <p className="mt-1 font-heading text-2xl font-bold leading-none text-foreground">
              {counts[object.key] ?? "—"}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{object.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-sm font-bold text-foreground">Pipeline stages</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[...STAGE_ORDER, "closed_lost"].map((stage) => {
            const meta = STAGE_META[stage];
            return (
              <span
                key={stage}
                className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", meta.pill)}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                {meta.label}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Deals move through these stages on the board. Moving a deal to At Risk / Recovery logs a recovery trigger
          on its timeline so stalled revenue is visible.
        </p>
      </div>
    </div>
  );
}