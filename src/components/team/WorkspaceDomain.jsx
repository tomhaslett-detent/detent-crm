import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const rows = (value) => (Array.isArray(value) ? value : value?.items ?? []);

export default function WorkspaceDomain() {
  const [record, setRecord] = useState(null);
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    base44.entities.CrmSettings.list("-updated_date", 1)
      .then((result) => {
        const [settings] = rows(result);
        setRecord(settings || null);
        setDomain(settings?.company_domain || "");
      })
      .catch(() => setStatus("Could not load the workspace domain."));
  }, []);

  async function save() {
    setBusy(true);
    setStatus("");
    try {
      const values = { company_domain: domain.trim().toLowerCase(), enforce_domain: true };
      if (record) await base44.entities.CrmSettings.update(record.id, values);
      else setRecord(await base44.entities.CrmSettings.create(values));
      setStatus("Only work emails at this domain can be invited.");
    } catch (error) {
      setStatus(error.message || "Could not save the domain.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-heading text-sm font-bold text-foreground">Work email domain</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Invitations are limited to this domain, so personal addresses cannot be added to the CRM.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Input
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="detentgtm.io"
          className="h-9 w-full text-sm sm:w-64"
        />
        <Button onClick={save} disabled={busy || !domain.trim()} className="h-9">
          {busy ? "Saving…" : "Save domain"}
        </Button>
      </div>
      {status && <p className="mt-2 text-xs text-muted-foreground">{status}</p>}
    </section>
  );
}