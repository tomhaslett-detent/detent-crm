import ImportSourceFields from "@/components/layout/ImportSourceFields";
import { importOrigin } from "@/lib/crm-import-source";
import { makeImportWorkbook, readImportWorkbook } from "@/lib/crm-import-workbook";
import { useState } from "react";
import { companyLinks, csvImportBatches, importedEmailStatus, parseHubSpotCsv } from "@/lib/hubspot-csv";
import { getHubSpotImportCounts, importHubSpotBatch, validateImportedCompanyLinks } from "@/lib/hubspot-csv-import";

export default function HubSpotCsvImport() {
  const [companies, setCompanies] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [source, setSource] = useState("");
  const [legacy, setLegacy] = useState(false);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState(null);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("");

  async function checkImportedCounts() {
    setChecking(true);
    try {
      setCounts(await getHubSpotImportCounts());
    } catch {
      setCounts(null);
      setStatus("Could not check imported HubSpot counts.");
    } finally {
      setChecking(false);
    }
  }

  async function downloadTemplate() {
    try {
      const bytes = await makeImportWorkbook();
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "Detent-CRM-import-template.xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setStatus("The template could not be downloaded.");
    }
  }

  async function preview() {
    setPlan(null);
    setBusy(true);
    try {
      const sourceName = legacy ? undefined : source.trim().toLowerCase();
      const origin = importOrigin(sourceName);
      const [companyText, contactText] = workbook
        ? await readImportWorkbook(workbook)
        : await Promise.all([companies?.text(), contacts?.text()]);
      const accounts = companyText === undefined ? [] : parseHubSpotCsv(companyText, "companies", origin);
      const people = contactText === undefined ? [] : parseHubSpotCsv(contactText, "contacts", origin);
      if (!accounts.length && !people.length) throw new Error("The selected files contain no records.");
      const accountIds = new Set(accounts.map((row) => row["record id"].trim()));
      let links = 0;
      const storedReferences = new Set();
      let withoutPrimary = 0;
      let unknownEmailStatus = 0;
      let unsubscribed = 0;
      for (const person of people) {
        const emailStatus = importedEmailStatus(person);
        if (emailStatus === "unknown") unknownEmailStatus += 1;
        if (emailStatus === "unsubscribed") unsubscribed += 1;
        const { all, primary } = companyLinks(person, origin);
        links += all.length;
        for (const id of all) if (!accountIds.has(id)) storedReferences.add(id);
        if (all.length && !primary) withoutPrimary += 1;
      }
      const storedIds = [...storedReferences];
      let missing = 0;
      for (let offset = 0; offset < storedIds.length; offset += 100) {
        const ids = storedIds.slice(offset, offset + 100);
        const result = await validateImportedCompanyLinks({ data: { ids, source: sourceName } });
        missing += result.missing;
      }
      if (missing) throw new Error(missing + " company IDs are missing from the selected file and the CRM for this source.");
      const batchCount = [accounts, people].reduce((total, rows) => total + Array.from(csvImportBatches(rows), () => 1).length, 0);
      setPlan({ accounts, people, source: sourceName });
      setStatus(accounts.length + " companies, " + people.length + " contacts, " + links + " company links. " +
        withoutPrimary + " contacts have multiple linked companies without a primary company. " +
        unsubscribed + " globally unsubscribed; " + unknownEmailStatus + " with unknown global unsubscribe status. " + batchCount + " batches ready.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    setBusy(true);
    let verified = 0;
    let added = 0;
    let existing = 0;
    try {
      for (const [kind, rows] of [["companies", plan.accounts], ["contacts", plan.people]]) {
        for (const records of csvImportBatches(rows)) {
          const result = await importHubSpotBatch({ data: { kind, source: plan.source, records } });
          verified += result.verified;
          added += result.added;
          existing += result.existing;
          setStatus("Verified " + verified + " records. Keep this page open.");
        }
      }
      setStatus("Import complete. " + verified + " verified, " + added + " added, " + existing + " already present.");
    } catch (error) {
      setStatus("Import stopped after " + verified + " verified records. " + error.message + " You can retry with the same files.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="font-heading text-sm font-bold">Import CRM records</h2>
      <p className="text-sm text-muted-foreground">Use the Excel template, a companies CSV, a contacts CSV, or both CSVs. Extract ZIP files before selecting the CSVs. Imported records are initially unassigned.</p>
      <button type="button" className="rounded border px-3 py-2 text-sm" onClick={downloadTemplate}>Download Excel template</button>
      <label className="block text-sm">Completed Excel template <input disabled={busy} type="file" accept=".xlsx" onChange={(event) => {setWorkbook(event.target.files[0]); setPlan(null); setStatus("");}} /></label>
      <ImportSourceFields source={source} legacy={legacy} disabled={busy}
        setSource={(value) => { setSource(value); setPlan(null); setStatus(""); }}
        setLegacy={(value) => { setLegacy(value); setPlan(null); setStatus(""); }} />
      <label className="block text-sm">Companies CSV <input disabled={busy || Boolean(workbook)} type="file" accept=".csv" onChange={(event) => {setCompanies(event.target.files[0]); setPlan(null); setStatus("");}} /></label>
      <label className="block text-sm">Contacts CSV <input disabled={busy || Boolean(workbook)} type="file" accept=".csv" onChange={(event) => {setContacts(event.target.files[0]); setPlan(null); setStatus("");}} /></label>
      <div className="flex gap-2">
        <button type="button" className="rounded border px-3 py-2 text-sm" disabled={busy || (!workbook && !companies && !contacts)} onClick={preview}>Validate files</button>
        <button type="button" className="rounded border px-3 py-2 text-sm" disabled={busy || !plan} onClick={load}>Import validated records</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" className="rounded border px-3 py-2" disabled={busy || checking} onClick={checkImportedCounts}>
          {checking ? "Checking…" : "Check Detent HubSpot totals"}
        </button>
        {counts && <div aria-live="polite" className="basis-full">
          <p>{counts.companies.toLocaleString("en-GB")} companies, {counts.contacts.toLocaleString("en-GB")} contacts, and {counts.deals.toLocaleString("en-GB")} deals stored.</p>
          <p>Activities stored by type: {counts.activities.map(({ kind, count }) => kind + " " + count.toLocaleString("en-GB")).join(", ")}.</p>
        </div>}
      </div>
      {status && <p role="status" className="text-sm">{status}</p>}
    </section>
  );
}
