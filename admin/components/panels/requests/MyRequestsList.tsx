import { useEffect, useState } from "react";
import { addToast } from "@heroui/react";
import { Plus, CalendarClock, X } from "lucide-react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { TableSkeletonRows } from "@/components/Skeleton";
import { useSettings } from "@/lib/SettingsContext";
import RequestStatusBadge from "./RequestStatusBadge";
import NewRequestModal from "./NewRequestModal";
import { leaveTypeLabel, formatDateRange } from "./leaveTypeLabels";
import type { LeaveRequest } from "@/types";

export default function MyRequestsList() {
  const { settings } = useSettings();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showNew, setShowNew] = useState(false);

  function load() {
    setFetching(true);
    api
      .get<{ requests: LeaveRequest[] }>("/leave-requests/mine")
      .then((res) => setRequests(res.data.requests))
      .finally(() => setFetching(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(request: LeaveRequest) {
    if (!confirm("Cancel this request?")) return;
    try {
      await api.post(`/leave-requests/${request._id}/cancel`);
      addToast({ title: "Request cancelled", severity: "success" });
      load();
    } catch (err) {
      addToast({ title: "Couldn't cancel request", description: getErrorMessage(err, "Something went wrong."), severity: "danger" });
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">My Requests</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg"
        >
          <Plus className="w-3.5 h-3.5" />
          New Request
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-left">
            <tr>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Dates</th>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Days</th>
              <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fetching ? (
              <TableSkeletonRows columns={5} rows={2} />
            ) : requests.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-400 text-sm" colSpan={5}>
                  No requests yet.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 text-slate-700">{leaveTypeLabel(r.type, settings.leaveTypes)}</td>
                  <td className="py-2.5 px-3 text-xs font-mono tabular-nums text-slate-500">
                    {formatDateRange(r.startDate, r.endDate)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{r.totalDays}</td>
                  <td className="py-2.5 px-3">
                    <RequestStatusBadge status={r.status} />
                    {r.status === "pending" && r.approvalStage !== "done" && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Awaiting {r.approvalStage === "manager" ? "manager" : "admin"} review
                      </p>
                    )}
                    {r.status !== "pending" && r.reviewNote && (
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate" title={r.reviewNote}>
                        {r.reviewNote}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {r.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(r)}
                        aria-label="Cancel request"
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NewRequestModal isOpen={showNew} onClose={() => setShowNew(false)} onCreated={load} />
    </div>
  );
}
