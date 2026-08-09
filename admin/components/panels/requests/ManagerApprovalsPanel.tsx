import { useEffect, useState } from "react";
import { UserCheck, Check, X as XIcon } from "lucide-react";
import api from "@/lib/axios";
import { TableSkeletonRows } from "@/components/Skeleton";
import { useSettings } from "@/lib/SettingsContext";
import Avatar from "@/components/panels/attendance/dashboard/Avatar";
import ReviewRequestModal from "./ReviewRequestModal";
import { leaveTypeLabel, formatDateRange } from "./leaveTypeLabels";
import type { LeaveRequest } from "@/types";

/** A direct-report approval queue for whoever is listed as someone's
 * `manager` - shown to any authenticated user, admin or not, since being a
 * manager in this app is just "someone else's employee record points at
 * you," not a separate role. Renders nothing once loaded if the caller
 * doesn't manage anyone. */
export default function ManagerApprovalsPanel() {
  const { settings } = useSettings();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<{ request: LeaveRequest; decision: "approved" | "rejected" } | null>(
    null
  );

  function load() {
    setFetching(true);
    api
      .get<{ requests: LeaveRequest[] }>("/leave-requests/for-review")
      .then((res) => setRequests(res.data.requests))
      .finally(() => setFetching(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (!fetching && requests.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <UserCheck className="w-4 h-4 text-slate-400" />
        <p className="text-sm font-semibold text-slate-900">My Approvals</p>
        <span className="text-[11px] text-slate-400">Requests from people who report to you</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-left">
            <tr>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Employee</th>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Dates</th>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Days</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fetching ? (
              <TableSkeletonRows columns={5} rows={2} />
            ) : (
              requests.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.employee.name} photoUrl={r.employee.photoUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{r.employee.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{r.employee.department || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{leaveTypeLabel(r.type, settings.leaveTypes)}</td>
                  <td className="py-2.5 px-3 text-xs font-mono tabular-nums text-slate-500">
                    {formatDateRange(r.startDate, r.endDate)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{r.totalDays}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setReviewTarget({ request: r, decision: "approved" })}
                        aria-label="Approve"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-emerald-600 hover:bg-emerald-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewTarget({ request: r, decision: "rejected" })}
                        aria-label="Reject"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-rose-600 hover:bg-rose-50"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ReviewRequestModal
        request={reviewTarget?.request ?? null}
        decision={reviewTarget?.decision ?? null}
        onClose={() => setReviewTarget(null)}
        onReviewed={load}
      />
    </div>
  );
}
