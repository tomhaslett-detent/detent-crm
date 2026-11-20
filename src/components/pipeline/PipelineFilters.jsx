import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOURCES, TIMEFRAMES } from "@/lib/crm";

export default function PipelineFilters({ owners = [], value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2 lg:w-auto lg:grid-cols-3">
      <Select value={value.owner} onValueChange={(owner) => onChange({ ...value, owner })}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Owner" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All owners</SelectItem>
          {owners.map((owner) => (
            <SelectItem key={owner} value={owner}>
              {owner}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.source} onValueChange={(source) => onChange({ ...value, source })}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {SOURCES.map((source) => (
            <SelectItem key={source.value} value={source.value}>
              {source.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.timeframe} onValueChange={(timeframe) => onChange({ ...value, timeframe })}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Timeframe" />
        </SelectTrigger>
        <SelectContent>
          {TIMEFRAMES.map((timeframe) => (
            <SelectItem key={timeframe.value} value={timeframe.value}>
              {timeframe.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}