import { useState } from "react";
import { useCrmPage } from "@/hooks/useCrmPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  title: "",
  account_id: "",
  role: "unknown",
  owner: "",
};

export default function ContactForm({ initial, onSubmit, submitting, error }) {
  const directory = useCrmPage("Account");
  const [values, setValues] = useState(() => (initial ? { ...EMPTY, ...initial } : EMPTY));
  const [linkedName, setLinkedName] = useState(initial?.account_name || "");
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      first_name: values.first_name.trim(),
      last_name: values.last_name || "",
      email: values.email || "",
      phone: values.phone || "",
      title: values.title || "",
      ...(!initial || values.account_id !== (initial.account_id || "") ? { account_id: values.account_id || "" } : {}),
      role: values.role,
      owner: values.owner || "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">First name</Label>
          <Input value={values.first_name} onChange={(event) => set("first_name", event.target.value)} className="mt-1 h-9" required />
        </div>
        <div>
          <Label className="text-xs">Last name</Label>
          <Input value={values.last_name} onChange={(event) => set("last_name", event.target.value)} className="mt-1 h-9" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Email</Label>
          <Input type="email" value={values.email} onChange={(event) => set("email", event.target.value)} className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input value={values.phone} onChange={(event) => set("phone", event.target.value)} className="mt-1 h-9" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Job title</Label>
          <Input value={values.title} onChange={(event) => set("title", event.target.value)} className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs" htmlFor="contact-account-search">Find account</Label>
          <Input id="contact-account-search" maxLength={100} value={directory.search} onChange={(event) => directory.changeSearch(event.target.value)} placeholder="Name or domain" className="mt-1 h-9" />
          <p className="mt-1 text-xs text-muted-foreground" role="status">
            {directory.error ? "Could not search accounts" : directory.loading ? "Searching accounts…" : directory.total > 50 ? "Showing the first 50 matches. Refine your search." : directory.total === 0 ? "No matching accounts" : ""}
          </p>
          <Select value={values.account_id || "none"} onValueChange={(value) => {
            set("account_id", value === "none" ? "" : value);
            setLinkedName(directory.records.find((account) => account.id === value)?.name || "");
          }}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue placeholder="Select account">{linkedName || "No account"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No account</SelectItem>
              {values.account_id && !directory.records.some((account) => account.id === values.account_id) && (
                <SelectItem value={values.account_id}>{linkedName || "Current account"}</SelectItem>
              )}
              {directory.records.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Buying role</Label>
          <Select value={values.role} onValueChange={(value) => set("role", value)}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="champion">Champion</SelectItem>
              <SelectItem value="decision_maker">Decision maker</SelectItem>
              <SelectItem value="influencer">Influencer</SelectItem>
              <SelectItem value="blocker">Blocker</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Owner</Label>
          <Input value={values.owner} onChange={(event) => set("owner", event.target.value)} className="mt-1 h-9" />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" className="h-9 w-full" disabled={submitting}>
        {submitting ? "Saving…" : initial ? "Save contact" : "Create contact"}
      </Button>
    </form>
  );
}