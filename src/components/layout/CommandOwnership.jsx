import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assignImportedOwnership, ownershipOptions, previewOwnership } from "@/lib/crm-owner-mapping";

export default function CommandOwnership() {
  const { user } = useAuth();
  const { data, isError } = useQuery({ queryKey: ["crm-ownership-options", user?.id], queryFn: () => ownershipOptions(), retry: false });
  const [object, setObject] = useState("Account");
  const [label, setLabel] = useState("");
  const [memberId, setMember] = useState("");
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(apply) {
    setBusy(true);
    setStatus("");
    try {
      const input = { object, ownerLabel: label.trim() };
      if (apply) {
        const result = await assignImportedOwnership({ data: { ...input, memberId, expectedCount: plan } });
        setPlan(result.remaining);
        setStatus("Verified " + result.verified + " assignments. " + result.remaining + " matching unassigned records remain.");
      } else {
        const result = await previewOwnership({ data: input });
        setPlan(result.count);
        setStatus(result.count + " unassigned records match this source label.");
      }
    } catch {
      setPlan(null);
      setStatus("Could not complete the ownership check. Confirm the owner label and membership, then preview again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-5">
      <h2 className="font-semibold">Assign imported ownership</h2>
      <p className="text-sm text-muted-foreground">Use the exact Company owner, Contact owner or Deal owner value from the Detent HubSpot export. Only records with no CRM owner and no team are eligible.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Record type
          <select className="mt-1 block w-full rounded border bg-background p-2" value={object} disabled={busy} onChange={(event) => { setObject(event.target.value); setPlan(null); setStatus(""); }}>
            <option value="Account">Companies</option><option value="Contact">Contacts</option>
            <option value="Deal">Deals</option>
          </select>
        </label>
        <label className="text-sm">Source owner label<Input className="mt-1" value={label} maxLength={200} disabled={busy} onChange={(event) => { setLabel(event.target.value); setPlan(null); setStatus(""); }} /></label>
        <label className="text-sm">CRM member
          <select className="mt-1 block w-full rounded border bg-background p-2" value={memberId} disabled={busy}
            onChange={(event) => setMember(event.target.value)}>
            <option value="">Choose a member</option>
            {data?.members.map((member) => <option key={member.id} value={member.id}>{member.email} · {member.team}</option>)}
          </select>
        </label>
      </div>
      {data?.members.length === 0 && <p className="text-sm text-muted-foreground">Add an active CRM member with a team before assigning records.</p>}
      {isError && <p role="alert">Could not load CRM members.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy || !label.trim()} onClick={() => run(false)}>Preview matches</Button>
        <Button type="button" disabled={busy || !memberId || !plan} onClick={() => run(true)}>Assign next {Math.min(plan || 250, 250)} records</Button>
      </div>
      {status && <p role="status" className="text-sm">{status}</p>}
    </section>
  );
}
