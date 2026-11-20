import { useCrmPage } from "@/hooks/useCrmPage";
import { useRegionalPreference } from "@/hooks/use-crm-region";
import { crmCurrencies, defaultRegion } from "@/lib/crm-regional";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOURCES, STAGE_META, STAGE_ORDER } from "@/lib/crm";

const EMPTY = {
  title: "",
  account_id: "",
  contact_id: "",
  value: "",
  currency: "",
  stage: "prospect",
  source: "outbound",
  owner: "",
  close_date: "",
  probability: 20,
  next_step: "",
};

export default function DealForm({ initial, accounts = [], contacts = [], onSubmit, submitting, error }) {
  const directory = useCrmPage("Account");
  const searchId = useId();
  const contactSearchId = useId();
  const [contactLabel, setContactLabel] = useState(initial?.contact_name || "");
  const [accountLabel, setAccountLabel] = useState(initial?.account_name || "");
  const preferences = useRegionalPreference();
  const defaultCurrency = initial ? "" : preferences.data?.currency ?? defaultRegion.currency;
  const [values, setValues] = useState(() => (initial ? { ...EMPTY, ...initial, value: initial.value ?? "" } : EMPTY));
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  const contactDirectory = useCrmPage("Contact", undefined, values.account_id ? { account_id: values.account_id } : undefined);
  const contactOptions = contactDirectory.records;

  const handleSubmit = (event) => {
    event.preventDefault();
    const account = [...directory.records, ...accounts].find((item) => item.id === values.account_id);
    const contact = [...contactOptions, ...contacts].find((item) => item.id === values.contact_id);
    onSubmit({
      title: values.title.trim(),
      ...(!initial || values.account_id !== (initial.account_id || "") ? { account_id: values.account_id || "" } : {}),
      account_name: account?.name || initial?.account_name || "",
      ...(!initial || values.contact_id !== (initial.contact_id || "") ? { contact_id: values.contact_id || "" } : {}),
      contact_name: contact ? `${contact.first_name} ${contact.last_name || ""}`.trim() : initial?.contact_name || "",
      value: Number(values.value) || 0,
      ...(values.currency || defaultCurrency ? { currency: values.currency || defaultCurrency } : {}),
      stage: values.stage,
      source: values.source,
      owner: values.owner || "",
      close_date: values.close_date || "",
      probability: Number(values.probability) || 0,
      next_step: values.next_step || "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label className="text-xs">Deal name</Label>
        <Input
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="e.g. Fleet telematics rollout"
          className="mt-1 h-9"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs" htmlFor={searchId}>Find account</Label>
          <Input id={searchId} maxLength={100} value={directory.search} onChange={(event) => directory.changeSearch(event.target.value)}
            placeholder="Name or domain" className="mt-1 h-9" />
          <p role="status" className="mt-1 text-xs text-muted-foreground">
            {directory.error ? "Could not search accounts." : directory.loading ? "Searching accounts…" : directory.total > 50 ? "Showing the first 50 matches. Refine your search." : directory.total === 0 ? "No matching accounts." : ""}
          </p>
          <Select value={values.account_id || "none"} onValueChange={(value) => {
            set("account_id", value === "none" ? "" : value);
            setAccountLabel(directory.records.find((account) => account.id === value)?.name || "");
            contactDirectory.changeSearch("");
          }}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue placeholder="Select account">{accountLabel || "No account"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No account</SelectItem>
              {values.account_id && !directory.records.some((account) => account.id === values.account_id) &&
                <SelectItem value={values.account_id}>{accountLabel || "Current account"}</SelectItem>}
              {directory.records.map((account) => (
                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs" htmlFor={contactSearchId}>Find primary contact</Label>
          <Input id={contactSearchId} maxLength={100} value={contactDirectory.search}
            onChange={(event) => contactDirectory.changeSearch(event.target.value)} placeholder="Name or email" className="mt-1 h-9" />
          <p role="status" className="mt-1 text-xs text-muted-foreground">
            {contactDirectory.error ? "Could not search contacts." : contactDirectory.loading ? "Searching contacts…" : contactDirectory.total > 50 ? "Showing the first 50 matches. Refine your search." : contactDirectory.total === 0 ? "No matching contacts." : ""}
          </p>
          <Select value={values.contact_id || "none"} onValueChange={(value) => {
            set("contact_id", value === "none" ? "" : value);
            const contact = contactOptions.find((item) => item.id === value);
            setContactLabel(contact ? [contact.first_name, contact.last_name].filter(Boolean).join(" ") : "");
          }}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue placeholder="Select contact">{contactLabel || "No contact"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No contact</SelectItem>
              {values.contact_id && !contactOptions.some((contact) => contact.id === values.contact_id) &&
                <SelectItem value={values.contact_id}>{contactLabel || "Current contact"}</SelectItem>}
              {contactOptions.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {`${contact.first_name} ${contact.last_name || ""}`.trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Value</Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={values.value}
            onChange={(event) => set("value", event.target.value)}
            placeholder="0"
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Currency</Label>
          <Select value={values.currency || defaultCurrency} onValueChange={(value) => set("currency", value)}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {crmCurrencies.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Probability %</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={values.probability}
            onChange={(event) => set("probability", event.target.value)}
            className="mt-1 h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Stage</Label>
          <Select value={values.stage} onValueChange={(value) => set("stage", value)}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...STAGE_ORDER, "closed_lost"].map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {STAGE_META[stage].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Source</Label>
          <Select value={values.source} onValueChange={(value) => set("source", value)}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Owner</Label>
          <Input
            value={values.owner}
            onChange={(event) => set("owner", event.target.value)}
            placeholder="Who owns it"
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Close date</Label>
          <Input
            type="date"
            value={values.close_date || ""}
            onChange={(event) => set("close_date", event.target.value)}
            className="mt-1 h-9"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Next step</Label>
        <Input
          value={values.next_step}
          onChange={(event) => set("next_step", event.target.value)}
          placeholder="What moves this forward"
          className="mt-1 h-9"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="submit" className="h-9 w-full" disabled={submitting || (!initial && preferences.isPending)}>
        {submitting ? "Saving…" : initial ? "Save deal" : "Create deal"}
      </Button>
    </form>
  );
}