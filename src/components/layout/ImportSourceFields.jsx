export default function ImportSourceFields({ source, setSource, legacy, setLegacy, disabled }) {
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <label className="block text-sm">
        Source name
        <input className="ml-2 rounded border bg-background px-2 py-1" value={source} disabled={legacy} maxLength={60}
          placeholder="previous-crm" onChange={(event) => setSource(event.target.value)} />
      </label>
      <p className="text-xs text-muted-foreground">Use the same source name across all files that link to each other.</p>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={legacy} onChange={(event) => setLegacy(event.target.checked)} />
        Add to the existing Detent HubSpot migration
      </label>
    </fieldset>
  );
}
