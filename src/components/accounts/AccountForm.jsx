import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMPTY = {
  name: "",
  domain: "",
  industry: "saas",
  employees: "11-50",
  region: "",
  health: "healthy",
  owner: "",
  arr: "",
  notes: "",
};

export default function AccountForm({ initial, onSubmit, submitting, error }) {
  const [values, setValues] = useState(() => (initial ? { ...EMPTY, ...initial, arr: initial.arr ?? "" } : EMPTY));
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      name: values.name.trim(),
      domain: values.domain || "",
      industry: values.industry,
      employees: values.employees,
      region: values.region || "",
      health: values.health,
      owner: values.owner || "",
      arr: Number(values.arr) || 0,
      notes: values.notes || "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label className="text-xs">Company name</Label>
        <Input value={values.name} onChange={(event) => set("name", event.target.value)} className="mt-1 h-9" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Domain</Label>
          <Input value={values.domain} onChange={(event) => set("domain", event.target.value)} placeholder="acme.com" className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Region</Label>
          <Input value={values.region} onChange={(event) => set("region", event.target.value)} placeholder="DACH" className="mt-1 h-9" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Industry</Label>
          <Select value={values.industry} onValueChange={(value) => set("industry", value)}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["saas", "fintech", "agency", "manufacturing", "healthcare", "retail", "logistics", "other"].map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry[0].toUpperCase() + industry.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Employees</Label>
          <Select value={values.employees} onValueChange={(value) => set("employees", value)}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Health</Label>
          <Select value={values.health} onValueChange={(value) => set("health", value)}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="watch">Watch</SelectItem>
              <SelectItem value="at_risk">At risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">ARR</Label>
          <Input type="number" min="0" value={values.arr} onChange={(event) => set("arr", event.target.value)} className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Owner</Label>
          <Input value={values.owner} onChange={(event) => set("owner", event.target.value)} className="mt-1 h-9" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea value={values.notes} onChange={(event) => set("notes", event.target.value)} rows={3} className="mt-1 text-xs" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" className="h-9 w-full" disabled={submitting}>
        {submitting ? "Saving…" : initial ? "Save account" : "Create account"}
      </Button>
    </form>
  );
}