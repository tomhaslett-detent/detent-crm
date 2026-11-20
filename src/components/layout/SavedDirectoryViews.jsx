import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeSavedView, getSavedViews } from "@/lib/crm-saved-views";

export default function SavedDirectoryViews({ object, search, onSearchChange }) {
  const { user } = useAuth();
  const views = useQuery({
    queryKey: ["crm-saved-views", user?.id, object],
    queryFn: () => getSavedViews({ data: { object } }),
    enabled: Boolean(user?.id),
    retry: false,
  });
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const current = views.data?.find(({ id }) => id === selected);

  function open(id) {
    const view = views.data?.find((item) => item.id === id);
    setSelected(id);
    setName(view?.name ?? "");
    setStatus("");
    onSearchChange(view?.search ?? "");
  }

  async function save(action) {
    setBusy(true);
    setStatus("");
    try {
      await changeSavedView({
        data: { action, object, ...(action !== "create" ? { id: selected } : {}),
          ...(action !== "delete" ? { view: { name, search } } : {}) },
      });
      if (action !== "update") {
        setSelected("");
        setName("");
      }
      await views.refetch();
      setStatus(action === "delete" ? "Saved view removed." : "Saved view updated.");
    } catch {
      setStatus("Could not change the saved view. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-3" aria-label="Saved views">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium">Saved view
          <select className="mt-1 block min-w-44 rounded-md border bg-background px-2 py-2 text-sm" value={selected} disabled={busy || views.isPending}
            onChange={(event) => open(event.target.value)}>
            <option value="">Choose a saved view</option>
            {views.data?.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium">View name
          <Input className="mt-1 h-9" value={name} maxLength={80} disabled={busy} onChange={(event) => setName(event.target.value)} />
        </label>
        <Button type="button" variant="outline" size="sm" disabled={busy || !search.trim() || !name.trim()} onClick={() => save(current ? "update" : "create")}>
          {current ? "Update saved view" : "Save current search"}
        </Button>
        {current && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => save("delete")}>Remove saved view</Button>}
      </div>
      {views.isError && <p role="alert" className="text-sm">Could not load saved views.</p>}
      {status && <p role="status" className="text-sm">{status}</p>}
    </section>
  );
}
