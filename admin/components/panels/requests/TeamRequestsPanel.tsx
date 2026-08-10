import { useEffect, useState } from "react";
import { Users, Plus } from "lucide-react";
import api from "@/lib/axios";
import { TableSkeletonRows } from "@/components/Skeleton";
import { useSettings } from "@/lib/SettingsContext";
import Avatar from "@/components/panels/attendance/dashboard/Avatar";
import RequestStatusBadge from "./RequestStatusBadge";
import RequestDetailPanel from "./RequestDetailPanel";
import NewRequestModal from "./NewRequestModal";
import { leaveTypeLabel, leaveRequestEmployeeName } from "./leaveTypeLabels";
import type { Employee, LeaveRequest } from "@/types";

type Scope = "pending" | "history";

export default function TeamRequestsPanel() {
  const { settings } = useSettings();
  const [scope, setScope] = useState<Scope>("pending");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  function load(targetScope: Scope) {
    setFetching(true);
    api
      .get<{ requests: LeaveRequest[] }>("/leave-requests", { params: { scope: targetScope } })
      .then((res) => setRequests(res.data.requests))
      .finally(() => setFetching(false));
  }

  useEffect(() => {
    load(scope);
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  useEffect(() => {
    api.get<{ employees: Employee[] }>("/employees").then((res) => setEmployees(res.data.employees));
  }, []);

  return (
    <div className="flex items-start gap-4">
      <div className={selected ? "w-1/3 min-w-0 shrink-0" : "w-full"}>
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-900">Team Requests</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
              <button
                type="button"
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Submit for Employee
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-left">
                <tr>
                  <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                  <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Days</th>
                  <th className="py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fetching ? (
                  <TableSkeletonRows columns={4} rows={3} />
                ) : requests.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-400 text-sm" colSpan={4}>
                      {scope === "pending" ? "No pending requests." : "No reviewed requests yet."}
                    </td>
                  </tr>
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
                            <p className="text-[11px] text-slate-400 truncate">
                              {r.employee?.department || "—"}
                              {r.submittedByAdmin && " · Submitted by admin"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{leaveTypeLabel(r.type, settings.leaveTypes)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.totalDays}</td>
                      <td className="py-2.5 px-3">
                        <RequestStatusBadge status={r.status} />
                        {r.status === "pending" && r.approvalStage === "manager" && (
                          <p className="text-[11px] text-amber-600 mt-0.5">Awaiting manager</p>
                        )}
                      </td>
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
              load(scope);
              setSelected(null);
            }}
          />
        </div>
      )}

      <NewRequestModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onCreated={() => load(scope)}
        employees={employees}
      />
    </div>
  );
}
