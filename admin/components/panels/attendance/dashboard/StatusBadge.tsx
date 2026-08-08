import { CheckCircle2, Clock, XCircle, AlertTriangle, TrendingUp } from "lucide-react";

export type DisplayStatus = "present" | "incomplete" | "absent" | "late" | "overtime";

const CONFIG: Record<DisplayStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  present: {
    label: "PRESENT",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    Icon: CheckCircle2,
  },
  incomplete: {
    label: "INCOMPLETE",
    className: "bg-amber-50 text-amber-700 border-amber-200/60",
    Icon: Clock,
  },
  absent: {
    label: "ABSENT",
    className: "bg-rose-50 text-rose-700 border-rose-200/60",
    Icon: XCircle,
  },
  late: {
    label: "LATE",
    className: "bg-orange-50 text-orange-700 border-orange-200/60",
    Icon: AlertTriangle,
  },
  overtime: {
    label: "OVERTIME",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
    Icon: TrendingUp,
  },
};

export default function StatusBadge({ status }: { status: DisplayStatus }) {
  const { label, className, Icon } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${className}`}
    >
      <Icon className="w-2.5 h-2.5" strokeWidth={2.5} />
      {label}
    </span>
  );
}
