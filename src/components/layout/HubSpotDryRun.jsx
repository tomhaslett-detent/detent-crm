import { useState } from "react";
import { previewHubSpot } from "@/lib/hubspot-dry-run";

export default function HubSpotDryRun() {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const messages = {
    connector_unavailable: "Base44 could not access the HubSpot connection. Check the connection in Base44.",
    portal_unverified: "HubSpot did not confirm the account identity. No records were sampled.",
    wrong_portal: "The connected HubSpot account is not Detent. No records were sampled.",
    sampled: "Dry run complete. Values stayed on the server and no CRM records were written.",
    error: "The dry run could not complete.",
  };

  async function run() {
    setBusy(true);
    try {
      setResult(await previewHubSpot());
    } catch {
      setResult({ status: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="font-heading text-sm font-bold">HubSpot migration preview</h2>
      <p className="text-sm text-muted-foreground">Check the Detent HubSpot connection, sample core records and test access to emails, notes, calls, meetings and tasks. It also checks file search and subscription definitions. The preview reports counts and endpoint status.</p>
      <button type="button" disabled={busy} onClick={run} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
        {busy ? "Checking HubSpot…" : "Run migration preview"}
      </button>
      {result && <p role="status" className="text-sm">{messages[result.status]}</p>}
      {result?.accountCheck && <p className="text-sm">Account check: {result.accountCheck}</p>}
      {result?.checks && <p className="text-xs text-muted-foreground">File search and subscription definitions are access checks. Private attachment downloads and contact-level consent history require separate verification.</p>}
      {result?.checks && <pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(result.checks, null, 2)}</pre>}
    </section>
  );
}
