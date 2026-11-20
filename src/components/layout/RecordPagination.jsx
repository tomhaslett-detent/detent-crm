import { useCrmRegion } from "@/hooks/use-crm-region";
import { Button } from "@/components/ui/button";

export default function RecordPagination({ page, setPage, pageSize, total, loading, hasNext }) {
  const region = useCrmRegion();
  if (!total) return null;
  return (
    <nav aria-label="Record pages" className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p aria-live="polite">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total.toLocaleString(region.locale)}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={loading || page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
        <Button variant="outline" size="sm" disabled={loading || !hasNext} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </nav>
  );
}
