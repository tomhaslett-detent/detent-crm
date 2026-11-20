import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { runAccessAudit } from "@/lib/crm-audit";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_INFO } from "@/components/team/RoleLegend";
import { cn } from "@/lib/utils";

const EXPECTED = {
  admin: { read: [1, 1, 1], create: [1, 1, 1], update: [1, 1, 1], delete: [1, 1, 1], export: [1, 1, 1], "log activity": [1, 1, 1] },
  revops: { read: [1, 1, 1], create: [1, 1, 1], update: [1, 1, 1], delete: [0, 0, 0], export: [1, 1, 1], "log activity": [1, 1, 1] },
  manager: { read: [1, 1, 0], create: [1, 1, 0], update: [1, 1, 0], delete: [0, 0, 0], export: [0, 0, 0], "log activity": [1, 1, 0] },
  rep: { read: [1, 0, 0], create: [1, 0, 0], update: [1, 0, 0], delete: [0, 0, 0], export: [0, 0, 0], "log activity": [1, 0, 0] },
  service: { read: [1, 1, 0], create: [0, 0, 0], update: [0, 0, 0], delete: [0, 0, 0], export: [0, 0, 0], "log activity": [1, 1, 0] },
  viewer: { read: [1, 1, 0], create: [0, 0, 0], update: [0, 0, 0], delete: [0, 0, 0], export: [0, 0, 0], "log activity": [0, 0, 0] },
};

const cell = (allowed) => (allowed ? "Allowed" : "Blocked");

function verdict(row) {
  const expected = EXPECTED[row.role]?.[row.action];
  if (!expected) return null;
  return [row.own, row.teammate, row.otherTeam].every((value, index) => Boolean(value) === Boolean(expected[index]));
}

export default function AccessAudit() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const result = await runAccessAudit();
      setRows(result.rows);
    } catch (err) {
      setError(err?.message || "The access check could not run.");
    } finally {
      setBusy(false);
    }
  }

  const failures = rows ? rows.filter((row) => verdict(row) === false).length : 0;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-bold text-foreground">Access check</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Runs the live access rules for every role against their own records, a teammate's records and another
            team's records, then compares the result with the intended matrix.
          </p>
        </div>
        <Button onClick={run} disabled={busy} className="h-9">
          <ShieldCheck className="mr-1.5 h-4 w-4" />
          {busy ? "Checking…" : "Run access check"}
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {rows && (
        <>
          <p className={cn("mt-3 text-xs font-semibold", failures ? "text-destructive" : "text-emerald-700")}>
            {failures ? `${failures} rule(s) differ from the intended matrix.` : "All rules match the intended matrix."}
          </p>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-[11px] uppercase tracking-wide">Role</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide">Action</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide">Own records</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide">Team records</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide">Other teams</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide">Check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const passed = verdict(row);
                  return (
                    <TableRow key={`${row.role}-${row.action}`}>
                      <TableCell className="text-[12px] font-semibold text-foreground">
                        {ROLE_INFO[row.role]?.label || "CRM admin"}
                      </TableCell>
                      <TableCell className="text-[12px] capitalize text-muted-foreground">{row.action}</TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">{cell(row.own)}</TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">{cell(row.teammate)}</TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">{cell(row.otherTeam)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          )}
                        >
                          {passed ? "Pass" : "Mismatch"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}