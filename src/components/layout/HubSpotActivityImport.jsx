import { downloadImportTable, readImportTable } from "@/lib/crm-import-workbook";
import ImportSourceFields from "@/components/layout/ImportSourceFields";
import { importOrigin } from "@/lib/crm-import-source";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { activityColumns, compareActivityInventory, readActivityCsv } from "@/lib/hubspot-activities";
import { importActivityBatch } from "@/lib/hubspot-activity-import";
import { csvImportBatches } from "@/lib/hubspot-csv";

function downloadCsv(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function HubSpotActivityImport() {
  const [file, setFile] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [restoreLinks, setRestoreLinks] = useState(false);
  const [source, setSource] = useState("");
  const [legacy, setLegacy] = useState(false);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function validate() {
    const sourceName = legacy ? undefined : source.trim().toLowerCase();
    setBusy(true);
    setResult("");
    setPlan(null);
    try {
      const origin = importOrigin(sourceName);
      const uploadedRows = readActivityCsv(await readImportTable(file, "Activities"), origin);
      if (!uploadedRows.length) throw new Error("The activity file has no records.");
      const coverage = inventory ? compareActivityInventory(await inventory.text(), uploadedRows, origin, restoreLinks) : null;
      const rows = coverage?.records ?? uploadedRows;
      let references = 0;
      let validated = 0;
      for (const records of csvImportBatches(rows)) {
        const report = await importActivityBatch({ data: { records, source: sourceName, preview: true } });
        references += report.attachmentReferences;
        validated += report.verified;
        setResult("Validated " + validated + " of " + rows.length + " activities.");
      }
      setPlan({ rows, missingCsv: coverage?.missingCsv });
      setResult(rows.length + " activities validated. " + references + " attachment IDs will be retained as references." +
        (coverage ? " Inventory: " + coverage.matched + " matched, " + coverage.missing + " missing, " +
          coverage.additional + " outside the inventory." : "") +
        (coverage?.compareLinks ? (restoreLinks ? " Links restored from inventory: " : " Missing links on matched activities: ") + coverage.missingLinks + "." : ""));
    } catch (error) {
      setResult(error.message || "Validation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    const sourceName = legacy ? undefined : source.trim().toLowerCase();
    setBusy(true);
    setResult("");
    let verified = 0;
    let added = 0;
    try {
      for (const records of csvImportBatches(plan.rows)) {
        const report = await importActivityBatch({ data: { records, source: sourceName, preview: false } });
        verified += report.verified;
        added += report.added;
        setResult("Verified " + verified + " of " + plan.rows.length + " activities.");
      }
      setResult("Activity import complete. " + verified + " verified, " + added + " added.");
    } catch (error) {
      setResult("Import stopped after " + verified + " verified. " + (error.message || "Please retry with the same file."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="font-heading text-sm font-bold">Import activity</h2>
      <p className="text-sm text-muted-foreground">Use the migration template for emails, notes, meetings, tasks and calls from any export you can map to these columns. Attachment IDs are references and file contents need a separate transfer.</p>
      <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => downloadCsv(activityColumns.join(",") + "\r\n", "Detent-CRM-activities.csv")}>Download activity CSV template</Button>
        <Button type="button" variant="outline" onClick={() => downloadImportTable("Activities", activityColumns).catch(() => setResult("The Excel template could not be downloaded."))}>
          Download activity Excel template
        </Button>
      </div>
      <ImportSourceFields source={source} legacy={legacy} disabled={busy}
        setSource={(value) => { setSource(value); setPlan(null); setResult(""); }}
        setLegacy={(value) => { setLegacy(value); setPlan(null); setResult(""); }} />
      <label className="block text-sm">
        Activity file <input type="file" accept=".csv,.xlsx" disabled={busy} onChange={(event) => { setFile(event.target.files[0]); setPlan(null); setResult(""); }} />
      </label>
      <label className="block text-sm">
        Activity ID or association inventory (optional) <input type="file" accept=".csv" disabled={busy} onChange={(event) => {
          setInventory(event.target.files[0]);
          setRestoreLinks(false);
          setPlan(null);
          setResult("");
        }} />
      </label>
      {inventory && <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={restoreLinks} disabled={busy} onChange={(event) => {
          setRestoreLinks(event.target.checked);
          setPlan(null);
          setResult("");
        }} />
        Restore missing links from the association inventory
      </label>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy || !file} onClick={validate}>Validate activity links</Button>
        <Button type="button" disabled={busy || !plan} onClick={load}>Import validated activities</Button>
      </div>
      {plan?.missingCsv && <Button type="button" variant="outline" disabled={busy}
        onClick={() => downloadCsv(plan.missingCsv, "Detent-CRM-missing-activities.csv")}>
        Download missing activity IDs
      </Button>}
      {result && <p role="status" className="text-sm">{result}</p>}
    </section>
  );
}
