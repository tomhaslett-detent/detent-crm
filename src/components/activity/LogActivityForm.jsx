import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACTIVITY_TYPES } from "@/lib/crm";

export default function LogActivityForm({ onSubmit, submitting = false, deals = null }) {
  const [type, setType] = useState("note");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [dealId, setDealId] = useState("none");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!subject.trim()) {
      setError("Add a short subject so the activity is easy to scan.");
      return;
    }
    setError("");
    await onSubmit({ type, subject: subject.trim(), body: body.trim(), deal_id: dealId === "none" ? "" : dealId });
    setSubject("");
    setBody("");
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-[140px] shrink-0 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Subject"
          className="h-9 text-xs"
        />
      </div>
      {deals && (
        <Select value={dealId} onValueChange={setDealId}>
          <SelectTrigger className="mt-2 h-9 text-xs">
            <SelectValue placeholder="Attach to a deal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No deal</SelectItem>
            {deals.map((deal) => (
              <SelectItem key={deal.id} value={deal.id}>
                {deal.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="What happened?"
        rows={2}
        className="mt-2 text-xs"
      />
      {error && <p className="mt-1.5 text-[11px] text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={submitting} className="mt-2 h-8 w-full text-xs">
        {submitting ? "Saving…" : "Log activity"}
      </Button>
    </form>
  );
}