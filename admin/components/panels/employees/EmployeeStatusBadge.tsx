import type { EmployeeStatus } from "@/types";

const CONFIG: Record<EmployeeStatus, { label: string; className: string }> = {
  active: { label: "ACTIVE", className: "bg-emerald-50 text-emerald-700" },
  pending_onboarding: { label: "PENDING ONBOARDING", className: "bg-amber-50 text-amber-700" },
  inactive: { label: "INACTIVE", className: "bg-slate-100 text-slate-500" },
  suspended: { label: "SUSPENDED", className: "bg-rose-50 text-rose-700" },
};

export default function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.inactive;
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
