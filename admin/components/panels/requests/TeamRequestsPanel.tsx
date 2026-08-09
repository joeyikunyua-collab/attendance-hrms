import { useEffect, useState } from "react";
import { Users, Check, X as XIcon } from "lucide-react";
import api from "@/lib/axios";
import { TableSkeletonRows } from "@/components/Skeleton";
import { useSettings } from "@/lib/SettingsContext";
import Avatar from "@/components/panels/attendance/dashboard/Avatar";
import RequestStatusBadge from "./RequestStatusBadge";
import ReviewRequestModal from "./ReviewRequestModal";
import { leaveTypeLabel, formatDateRange } from "./leaveTypeLabels";
import type { LeaveRequest } from "@/types";

type Scope = "pending" | "history";

export default function TeamRequestsPanel() {
  const { settings } = useSettings();
  const [scope, setScope] = useState<Scope>("pending");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<{ request: LeaveRequest; decision: "approved" | "rejected" } | null>(
    null
  );

  function load(targetScope: Scope) {
    setFetching(true);
    api
      .get<{ requests: LeaveRequest[] }>("/leave-requests", { params: { scope: targetScope } })
      .then((res) => setRequests(res.data.requests))
      .finally(() => setFetching(false));
  }

  useEffect(() => {
    load(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Team Requests</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setScope("pending")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              scope === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setScope("history")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              scope === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            History
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-left">
            <tr>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Employee</th>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Dates</th>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Days</th>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fetching ? (
              <TableSkeletonRows columns={6} rows={3} />
            ) : requests.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-slate-400 text-sm" colSpan={6}>
                  {scope === "pending" ? "No pending requests." : "No reviewed requests yet."}
                </td>
              </tr>
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
                  <td className="py-2.5 px-3">
                    <RequestStatusBadge status={r.status} />
                    {r.status === "pending" && r.approvalStage === "manager" && (
                      <p className="text-[11px] text-amber-600 mt-0.5">Awaiting manager (override available)</p>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {r.status === "pending" ? (
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
                    ) : (
                      r.reviewNote && (
                        <p className="text-[11px] text-slate-400 max-w-[160px] truncate ml-auto" title={r.reviewNote}>
                          {r.reviewNote}
                        </p>
                      )
                    )}
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
        onReviewed={() => load(scope)}
      />
    </div>
  );
}
