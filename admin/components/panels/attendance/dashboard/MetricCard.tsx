import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface MetricCardProps {
  label: string;
  value: number | string;
  helperText?: string;
  /** Small colored delta pill (e.g. "+2.1% vs last month") - green when
   * positive, rose when negative. Takes precedence over helperText/action. */
  trend?: { value: number; label: string };
  action?: ReactNode;
  icon: LucideIcon;
  tone?: "slate" | "blue" | "emerald" | "red";
}

const TONE_CLASSES: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
};

export default function MetricCard({ label, value, helperText, trend, action, icon: Icon, tone = "slate" }: MetricCardProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {/* Reserve the row even when there's nothing to show, so cards in the
            same grid row stay the same height instead of jumping around. */}
        <div className="mt-1 h-4">
          {trend ? (
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                trend.value >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value.toFixed(1)}% {trend.label}
            </span>
          ) : (
            <>
              {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
              {action}
            </>
          )}
        </div>
      </div>
      <div className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl ${TONE_CLASSES[tone]}`}>
        <Icon className="w-[18px] h-[18px]" strokeWidth={2.25} />
      </div>
    </div>
  );
}
