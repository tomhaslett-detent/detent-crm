import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { crmCurrencies, crmLocales, dateForRegion, moneyForRegion, regionalZones } from "@/lib/crm-regional";
import { saveRegionalPreference } from "@/lib/crm-regional-server";
import { regionalKey, useRegionalPreference } from "@/hooks/use-crm-region";

const control = "mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm";
export default function RegionalSettings() {
  const { user } = useAuth();
  const prefs = useRegionalPreference();
  const client = useQueryClient();
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const current = draft ?? prefs.data;

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const updated = await saveRegionalPreference({ data: current });
      client.setQueryData(regionalKey(user?.id), updated);
      setDraft(null);
      setStatus("Regional settings saved.");
    } catch {
      setStatus("Could not save regional settings. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="font-heading text-sm font-bold">Regional settings</h2>
      <p className="text-sm text-muted-foreground">These settings follow your account. The currency defaults on new deals.</p>
      {prefs.isError && <p role="alert">Could not load regional settings.</p>}
      {!current && !prefs.isError && <p role="status">Loading preferences…</p>}
      {current && <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Locale
            <select className={control} value={current.locale} disabled={busy} onChange={(event) => setDraft({ ...current, locale: event.target.value })}>
              {crmLocales.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm">Time zone
            <select className={control} value={current.time_zone} disabled={busy} onChange={(event) => setDraft({ ...current, time_zone: event.target.value })}>
              {regionalZones.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-sm">Default deal currency
            <select className={control} value={current.currency} disabled={busy} onChange={(event) => setDraft({ ...current, currency: event.target.value })}>
              {crmCurrencies.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Preview · {dateForRegion("2026-11-20T12:30:00Z", current, true)} · {moneyForRegion(1234.56, current.currency, current)}</p>
        <Button type="submit" disabled={busy || !draft}>{busy ? "Saving…" : "Save regional settings"}</Button>
      </form>}
      {status && <p role="status" className="text-sm">{status}</p>}
    </section>
  );
}
