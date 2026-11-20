import HubSpotDryRun from "@/components/layout/HubSpotDryRun";
import CommandOwnership from "@/components/layout/CommandOwnership";
import { useCrmRegion } from "@/hooks/use-crm-region";
import { useState } from "react";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/AuthContext";
import { getCommandCentre, getHelpLibrary, saveHelpGuide } from "@/lib/crm-command";
import { isDetentStaff } from "@/lib/crm-staff";

export const Route = createFileRoute("/_authed/command-centre")({
  beforeLoad: ({ context }) => {
    if (!isDetentStaff(context.user)) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Command Centre · Detent CRM" }] }),
  component: CommandCentre,
});

const metrics = [
  ["accounts", "Companies"], ["contacts", "Contacts"], ["deals", "Deals"], ["activities", "Activities"],
  ["activeMembers", "Active CRM memberships"], ["importedCompanies", "Detent HubSpot companies"],
  ["importedContacts", "Detent HubSpot contacts"], ["guides", "Published guides"],
];
const blankGuide = { title: "", category: "", body: "" };

function CommandCentre() {
  const region = useCrmRegion();
  const { user } = useAuth();
  const overview = useQuery({ queryKey: ["crm-command-centre", user?.id], queryFn: () => getCommandCentre(), retry: false });
  const library = useQuery({ queryKey: ["crm-help-library", user?.id], queryFn: () => getHelpLibrary(), retry: false });
  const [key, setKey] = useState("");
  const [form, setForm] = useState(blankGuide);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = busy || library.isError;
  const current = library.data?.find((guide) => guide.article_key === key);

  function select(guide) {
    setKey(guide.article_key);
    const fields = guide.draft ?? guide.published ?? blankGuide;
    setForm({ title: fields.title ?? "", category: fields.category ?? "", body: fields.body ?? "" });
    setMessage("");
  }
  async function save(action) {
    setBusy(true);
    setMessage("");
    try {
      await saveHelpGuide({ data: { key, action, ...(action === "unpublish" ? {} : { article: form }) } });
      await Promise.all([library.refetch(), overview.refetch()]);
      setMessage(action === "draft" ? "Draft saved." : action === "publish" ? "Guide published." : "Guide unpublished.");
    } catch {
      setMessage("Could not save the guide. Check the fields and retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Command Centre" description="Detent staff operations and CRM product help." />
      {overview.isError && <p role="alert">Could not load the CRM overview.</p>}
      {overview.data && <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(([key, label]) => <div className="rounded-xl border bg-card p-4" key={key}>
          <dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-xl font-semibold">{overview.data[key].toLocaleString(region.locale)}</dd>
        </div>)}
      </dl>}
      <nav className="flex flex-wrap gap-3 text-sm" aria-label="Staff operations">
        <Link className="underline" to="/team">Manage team access</Link>
        <Link className="underline" to="/roles">Review CRM roles</Link>
        <Link className="underline" to="/settings">Open import and export</Link>
        <Link className="underline" to="/ask-detent">Test published help</Link>
      </nav>
      <HubSpotDryRun />
      <CommandOwnership />
      <section className="space-y-3 rounded-xl border bg-card p-5" aria-label="Manage Ask Detent guides">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Ask Detent knowledgebase</h2>
          <Button type="button" variant="outline" disabled={locked} onClick={() => select({ article_key: "guide-" + crypto.randomUUID(), draft: blankGuide })}>New guide</Button>
        </div>
        {library.isError && <p role="alert">Could not load the guide library.</p>}
        <label className="block text-sm">Guide
          <select className="ml-2 rounded border bg-background p-2" value={current ? key : ""} disabled={locked}
            onChange={(event) => { const item = library.data?.find((guide) => guide.article_key === event.target.value); if (item) select(item); }}>
            <option value="">Select a guide</option>
            {library.data?.map((guide) => <option value={guide.article_key} key={guide.article_key}>{guide.draft?.title || guide.published?.title} · {guide.enabled ? "Published" : "Unpublished"}</option>)}
          </select>
        </label>
        {key && <div className="space-y-3">
          <label className="block text-sm">Title<Input maxLength={140} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} disabled={locked} /></label>
          <label className="block text-sm">Category<Input maxLength={60} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} disabled={locked} /></label>
          <label className="block text-sm">Guide body<Textarea rows={8} maxLength={20000} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} disabled={locked} /></label>
          <p className="text-xs text-muted-foreground">Drafts are visible to Detent staff. Publish only shared CRM help suitable for all authorised CRM users.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={locked || !form.title.trim() || !form.category.trim() || form.body.trim().length < 30} onClick={() => save("draft")}>Save draft</Button>
            <Button type="button" disabled={locked || !form.title.trim() || !form.category.trim() || form.body.trim().length < 30} onClick={() => save("publish")}>Publish</Button>
            {current?.enabled && <Button type="button" variant="outline" disabled={locked} onClick={() => save("unpublish")}>Unpublish</Button>}
          </div>
        </div>}
        {message && <p role="status" className="text-sm">{message}</p>}
      </section>
    </div>
  );
}
