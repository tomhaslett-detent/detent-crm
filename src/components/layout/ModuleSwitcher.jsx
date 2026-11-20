import { useState } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const MODULES = [
  { name: "CRM", description: "Pipeline, accounts & activity", installed: true },
  { name: "Engage", description: "Sequences & outreach", installed: false },
  { name: "Recover", description: "Churn & payment recovery", installed: false },
];

export default function ModuleSwitcher({ compact = false }) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button aria-label="Detent CRM modules"
          className={cn(
            "flex items-center gap-2.5 rounded-lg text-left outline-none transition-colors",
            compact ? "py-1" : "px-2 py-1 hover:bg-white/5"
          )}
        >
          <img
            src={compact ? "/brand/wordmark-colour.svg" : "/brand/wordmark-reversed.svg"}
            alt="Detent"
            className="h-6 w-auto shrink-0"
          />
          <span className={cn("text-sm font-semibold", compact ? "text-foreground" : "text-white")}>CRM</span>
          <ChevronDown className={cn("h-3 w-3", compact ? "text-muted-foreground" : "text-frame-muted")} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          GTM OS modules
        </DropdownMenuLabel>
        {MODULES.map((module) => (
          <DropdownMenuItem
            key={module.name}
            disabled={!module.installed}
            className="flex items-start gap-2 py-2"
          >
            {module.installed ? (
              <Check className="mt-0.5 h-4 w-4 text-primary" />
            ) : (
              <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
            )}
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{module.name}</span>
              <span className="block text-xs text-muted-foreground">
                {module.installed ? module.description : "Not installed yet"}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Modules stay self-contained so each one can be added to the GTM OS suite.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}