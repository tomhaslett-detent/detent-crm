import { differenceInCalendarDays, format, parseISO } from "date-fns";

export const STAGE_ORDER = ["prospect", "engaged", "proposal", "at_risk", "closed_won"];

export const OPEN_STAGES = ["prospect", "engaged", "proposal", "at_risk"];

export function nextStageOf(stage) {
  const index = STAGE_ORDER.indexOf(stage);
  if (index === -1 || index === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[index + 1];
}

export const STAGE_META = {
  prospect: {
    label: "Prospect",
    dot: "bg-slate-400",
    glow: "shadow-[0_0_10px_rgba(148,163,184,0.9)]",
    pill: "bg-slate-100 text-slate-700",
  },
  engaged: {
    label: "Engaged",
    dot: "bg-indigo-400",
    glow: "shadow-[0_0_10px_rgba(129,140,248,0.95)]",
    pill: "bg-indigo-50 text-indigo-700",
  },
  proposal: {
    label: "Proposal",
    dot: "bg-indigo-600",
    glow: "shadow-[0_0_10px_rgba(79,70,229,0.95)]",
    pill: "bg-indigo-100 text-indigo-800",
  },
  at_risk: {
    label: "At Risk / Recovery",
    dot: "bg-amber-500",
    glow: "shadow-[0_0_10px_rgba(245,158,11,0.95)]",
    pill: "bg-amber-50 text-amber-700",
  },
  closed_won: {
    label: "Closed Won",
    dot: "bg-emerald-600",
    glow: "shadow-[0_0_10px_rgba(5,150,105,0.95)]",
    pill: "bg-emerald-50 text-emerald-700",
  },
  closed_lost: {
    label: "Closed Lost",
    dot: "bg-rose-600",
    glow: "shadow-[0_0_10px_rgba(225,29,72,0.9)]",
    pill: "bg-rose-50 text-rose-700",
  },
};

export const SOURCES = [
  { value: "outbound", label: "Outbound" },
  { value: "inbound", label: "Inbound" },
  { value: "referral", label: "Referral" },
  { value: "partner", label: "Partner" },
  { value: "event", label: "Event" },
  { value: "expansion", label: "Expansion" },
];

export const ACTIVITY_TYPES = [
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Note" },
  { value: "task", label: "Task" },
  { value: "recovery", label: "Recovery trigger" },
];

export const TIMEFRAMES = [
  { value: "all", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "quarter", label: "This quarter" },
];

export function rows(result) {
  if (Array.isArray(result)) return result;
  return result?.items || [];
}

export function formatMoney(value, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function compactMoney(value, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) return "—";
  return format(parseISO(value), "d MMM yyyy");
}

export function daysSince(value) {
  if (!value) return null;
  return differenceInCalendarDays(new Date(), parseISO(value));
}

export function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function velocityOf(deal) {
  const days = daysSince(deal?.last_activity_date);
  if (days === null) {
    return {
      days: null,
      label: "No activity",
      tone: "none",
      dot: "bg-slate-300",
      bar: "bg-slate-300",
      text: "text-muted-foreground",
      width: "w-1/5",
    };
  }
  if (days >= 14) {
    return {
      days,
      label: `${days}d stagnant`,
      tone: "stagnant",
      dot: "bg-amber-500",
      bar: "bg-amber-500",
      text: "text-amber-600",
      width: "w-1/3",
    };
  }
  if (days >= 7) {
    return {
      days,
      label: `${days}d cooling`,
      tone: "cooling",
      dot: "bg-amber-400",
      bar: "bg-amber-400",
      text: "text-amber-600",
      width: "w-2/3",
    };
  }
  return {
    days,
    label: days === 0 ? "Active today" : `${days}d active`,
    tone: "fresh",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
    width: "w-full",
  };
}