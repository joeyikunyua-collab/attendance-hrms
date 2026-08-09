import type { LeaveRequestStatus } from "@/types";

const CONFIG: Record<LeaveRequestStatus, { label: string; className: string }> = {
  pending: { label: "PENDING", className: "bg-amber-50 text-amber-700" },
  approved: { label: "APPROVED", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "REJECTED", className: "bg-rose-50 text-rose-700" },
  cancelled: { label: "CANCELLED", className: "bg-slate-100 text-slate-500" },
};

export default function RequestStatusBadge({ status }: { status: LeaveRequestStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.pending;
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
