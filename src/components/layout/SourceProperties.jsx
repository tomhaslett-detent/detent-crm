import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormDialog from "@/components/forms/FormDialog";
import { getSourceProperties } from "@/lib/crm-access";
import { useAuth } from "@/lib/AuthContext";

const empty = [];

export default function SourceProperties({ object, record }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const canRead = user?.role === "admin" && Boolean(record?.hubspot_source_key);
  const query = useQuery({
    queryKey: ["crm-source-properties", user?.id, object, record?.id],
    enabled: canRead && open,
    queryFn: () => getSourceProperties({ data: { object, id: record.id } }),
    retry: false,
    gcTime: 0,
  });
  if (!canRead) return null;
  const term = filter.trim().toLowerCase();
  const matching = (query.data?.properties ?? empty).filter(([label]) => label.toLowerCase().includes(term));
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); setOpen(true); }}>
        Source properties
      </Button>
      <FormDialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setFilter(""); }} title="Imported source properties" description="Original values retained during import.">
        <div className="space-y-3" onClick={(event) => event.stopPropagation()}>
          {query.isPending && <p role="status">Loading source properties…</p>}
          {query.isError && <p role="alert">Could not load the source properties.</p>}
          {query.data && (
            <>
              <p className="break-all text-xs text-muted-foreground">Source key {query.data.sourceKey}</p>
              <Input aria-label="Filter source fields" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter by property name" />
              <p className="text-xs text-muted-foreground" aria-live="polite">{matching.length} populated fields</p>
              <dl className="max-h-[45vh] overflow-y-auto divide-y divide-border">
                {matching.map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-2">
                    <dt className="text-xs font-semibold">{label}</dt>
                    <dd className="whitespace-pre-wrap break-all text-xs">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>
      </FormDialog>
    </>
  );
}
