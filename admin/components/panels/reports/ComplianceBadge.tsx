import type { DisplayStatus } from "@/components/panels/attendance/dashboard/StatusBadge";

const CONFIG: Record<DisplayStatus, { label: string; className: string }> = {
  present: { label: "COMPLETED", className: "bg-emerald-50 text-emerald-700" },
  incomplete: { label: "MISSING OUT", className: "bg-rose-50 text-rose-700" },
  overtime: { label: "OVERTIME", className: "bg-indigo-50 text-indigo-700" },
  late: { label: "LATE", className: "bg-amber-50 text-amber-700" },
  absent: { label: "ABSENT", className: "bg-rose-50 text-rose-700" },
};

/** Report-specific vocabulary ("COMPLETED"/"MISSING OUT") layered on top of
 * the same derived status used everywhere else in attendance - deliberately
 * a separate component from the dashboard's StatusBadge rather than an
 * overloaded prop, so the two modules' wording can't drift into each other. */
export default function ComplianceBadge({ status }: { status: DisplayStatus }) {
  const { label, className } = CONFIG[status];
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
