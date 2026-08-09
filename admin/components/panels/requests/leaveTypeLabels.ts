import type { LeaveTypeConfig } from "@/types";

/** Looks up a leave type's display label from the admin-configured list -
 * falls back to a title-cased version of the raw key for requests whose
 * type has since been removed from Settings, so old history never breaks. */
export function leaveTypeLabel(key: string, leaveTypes: LeaveTypeConfig[]): string {
  const match = leaveTypes.find((t) => t.key === key);
  if (match) return match.label;
  return key
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function formatDateRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(startIso).toLocaleDateString(undefined, opts);
  const end = new Date(endIso).toLocaleDateString(undefined, { ...opts, year: "numeric" });
  return `${start} – ${end}`;
}
