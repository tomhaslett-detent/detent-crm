import { useEffect, useState } from "react";
import { listMembers, manageMember } from "@/lib/team-fns";
import { roles } from "@/lib/crm-policy";

const labels = { revops: "RevOps", manager: "Sales Manager", rep: "Sales Rep", service: "Service", viewer: "Read-only" };
const control = "rounded border border-border bg-background px-3 py-2 text-sm";

export default function TeamAccess() {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState("");
  const [team, setTeam] = useState("");
  const [role, setRole] = useState("rep");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listMembers().then(setMembers).catch(() => setStatus("Could not load memberships."));
  }, []);

  async function submit(action) {
    setBusy(true);
    setStatus("");
    try {
      await manageMember({ data: { action, email, team: action === "revoke" ? undefined : team, role } });
      setMembers(await listMembers());
      setStatus(action === "invite" ? "Invitation requested. The recipient must sign in with this email." : "Membership updated.");
    } catch (error) {
      setStatus(error.message || "Membership change failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="font-heading text-sm font-bold">Users and teams</h2>
      <p className="text-sm text-muted-foreground">Invite by work email and assign a role and team. Users must sign in with the invited email.</p>
      <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); submit("invite"); }}>
        <label className="grid gap-1 text-sm">Work email<input className={control} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="grid gap-1 text-sm">Team<input className={control} required maxLength={60} value={team} onChange={(e) => setTeam(e.target.value)} /></label>
        <label className="grid gap-1 text-sm">Role<select className={control} value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((key) => <option key={key} value={key}>{labels[key]}</option>)}</select></label>
        <button className={control} disabled={busy}>Send invite</button>
        <button className={control} type="button" disabled={busy || !email || !team} onClick={() => submit("update")}>Update access</button>
        <button className={control} type="button" disabled={busy || !email} onClick={() => submit("revoke")}>Revoke access</button>
      </form>
      {status && <p role="status" className="text-sm">{status}</p>}
      <ul className="divide-y divide-border text-sm">
        {members.map((m) => <li className="py-2" key={m.id}><button type="button" className="underline" onClick={() => {setEmail(m.email); setTeam(m.crm_team || ""); setRole(roles.includes(m.crm_role) ? m.crm_role : "rep");}}>{m.email}</button> · {labels[m.crm_role] || m.crm_role} · {m.crm_team} · {m.status === "active" ? "Access assigned" : m.status}</li>)}
      </ul>
    </section>
  );
}
