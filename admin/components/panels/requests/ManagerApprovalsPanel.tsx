import { useEffect, useState } from "react";
import { UserCheck } from "lucide-react";
import api from "@/lib/axios";
import { TableSkeletonRows } from "@/components/Skeleton";
import { useSettings } from "@/lib/SettingsContext";
import Avatar from "@/components/panels/attendance/dashboard/Avatar";
import RequestDetailPanel from "./RequestDetailPanel";
import { leaveTypeLabel, leaveRequestEmployeeName } from "./leaveTypeLabels";
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
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  function load() {
    setFetching(true);
    api
      .get<{ requests: LeaveRequest[] }>("/leave-requests/for-review")
      .then((res) => setRequests(res.data.requests))
      // Not every login has a linked employee record (e.g. an admin-only
      // seed account) - this 403s for those, same as GET /employees/me
      // does elsewhere. There's nothing to review either way, so it's
      // treated the same as "no pending requests" (renders nothing below).
      .catch(() => {})
      .finally(() => setFetching(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (!fetching && requests.length === 0) return null;

  return (
    <div className="flex items-start gap-4">
      <div className={selected ? "w-1/3 min-w-0 shrink-0" : "w-full"}>
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-900">My Approvals</p>
            {!selected && <span className="text-[11px] text-slate-400">Requests from people who report to you</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-left">
                <tr>
                  <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                  <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fetching ? (
                  <TableSkeletonRows columns={3} rows={2} />
                ) : (
                  requests.map((r) => (
                    <tr
                      key={r._id}
                      onClick={() => setSelected((prev) => (prev?._id === r._id ? null : r))}
                      className={`cursor-pointer transition-colors ${
                        selected?._id === r._id ? "bg-blue-50/80 hover:bg-blue-50" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={leaveRequestEmployeeName(r.employee)} photoUrl={r.employee?.photoUrl ?? null} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{leaveRequestEmployeeName(r.employee)}</p>
                            <p className="text-[11px] text-slate-400 truncate">{r.employee?.department || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{leaveTypeLabel(r.type, settings.leaveTypes)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.totalDays}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <div className="w-2/3 min-w-0">
          <RequestDetailPanel
            request={selected}
            onClose={() => setSelected(null)}
            onReviewed={() => {
              load();
              setSelected(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
