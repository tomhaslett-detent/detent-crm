import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/layout/PageHeader";
import { askCrmHelp } from "@/lib/crm-command";

export const Route = createFileRoute("/_authed/ask-detent")({
  head: () => ({ meta: [{ title: "Ask Detent · Detent CRM" }] }),
  component: AskDetent,
});

function AskDetent() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setError("");
    try {
      setResult((await askCrmHelp({ data: { question } })).guides);
    } catch {
      setError("Could not search the published CRM guides. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="Ask Detent" description="Find answers in the published Detent CRM guides." />
      <form onSubmit={submit} className="space-y-2 rounded-xl border bg-card p-4">
        <label htmlFor="crm-help-question" className="block text-sm font-medium">What do you need help with?</label>
        <div className="flex gap-2">
          <Input id="crm-help-question" value={question} maxLength={400} onChange={(event) => setQuestion(event.target.value)} placeholder="How do I import contacts?" />
          <Button disabled={busy || question.trim().length < 3}>{busy ? "Searching…" : "Search guides"}</Button>
        </div>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {result?.length === 0 && <p role="status" className="text-sm">No published guide matched. Try a different question or contact Detent support.</p>}
      {result?.map((guide) => (
        <article className="space-y-2 rounded-xl border bg-card p-5" key={guide.key}>
          <p className="text-xs text-muted-foreground">{guide.category}</p>
          <h2 className="font-semibold">{guide.title}</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{guide.body}</p>
        </article>
      ))}
    </div>
  );
}
