import { downloadImportTable, readImportTable } from "@/lib/crm-import-workbook";
import ImportSourceFields from "@/components/layout/ImportSourceFields";
import { importOrigin } from "@/lib/crm-import-source";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { dealColumns, readDealCsv } from "@/lib/hubspot-deals";
import { importDealBatch } from "@/lib/hubspot-deal-import";
import { csvImportBatches } from "@/lib/hubspot-csv";

function downloadHeaders() {
  const url = URL.createObjectURL(new Blob([dealColumns.join(",") + "\r\n"], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "Detent-CRM-deals.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function HubSpotDealImport() {
  const [file, setFile] = useState(null);
  const [source, setSource] = useState("");
  const [legacy, setLegacy] = useState(false);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function run(preview) {
    const sourceName = legacy ? undefined : source.trim().toLowerCase();
    setBusy(true);
    setResult("");
    let verified = 0;
    let added = 0;
    if (preview) setPlan(null);
    try {
      const rows = preview ? readDealCsv(await readImportTable(file, "Deals"), importOrigin(sourceName)) : plan;
      if (!rows.length) throw new Error("The deal file has no records.");
      for (const records of csvImportBatches(rows)) {
        const report = await importDealBatch({ data: { records, source: sourceName, preview } });
        verified += report.verified;
        added += report.added;
        setResult((preview ? "Validated " : "Verified ") + verified + " of " + rows.length + " deals.");
      }
      if (preview) setPlan(rows);
      setResult(preview ? verified + " deals validated." : verified + " deals verified, " + added + " added.");
    } catch (error) {
      setResult((preview ? "Validation failed. " : "Import stopped after " + verified + " verified. ") + (error.message || "Please retry."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="font-heading text-sm font-bold">Import deals</h2>
      <p className="text-sm text-muted-foreground">Fill in CRM Stage for each deal. The original pipeline and stage are retained in the source fields.</p>
      <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={downloadHeaders}>Download deal CSV template</Button>
        <Button type="button" variant="outline" onClick={() => downloadImportTable("Deals", dealColumns).catch(() => setResult("The Excel template could not be downloaded."))}>
          Download deal Excel template
        </Button>
      </div>
      <ImportSourceFields source={source} legacy={legacy} disabled={busy}
        setSource={(value) => { setSource(value); setPlan(null); setResult(""); }}
        setLegacy={(value) => { setLegacy(value); setPlan(null); setResult(""); }} />
      <label className="block text-sm">Deal file <input type="file" accept=".csv,.xlsx" disabled={busy} onChange={(event) => { setFile(event.target.files[0]); setPlan(null); setResult(""); }} /></label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy || !file} onClick={() => run(true)}>Validate deal mappings</Button>
        <Button type="button" disabled={busy || !plan} onClick={() => run(false)}>Import validated deals</Button>
      </div>
      {result && <p role="status" className="text-sm">{result}</p>}
    </section>
  );
}
