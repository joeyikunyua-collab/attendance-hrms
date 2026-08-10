import { useState } from "react";
import { addToast } from "@heroui/react";
import { X, Check, X as XIcon, Calendar, Clock } from "lucide-react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { useSettings } from "@/lib/SettingsContext";
import Avatar from "@/components/panels/attendance/dashboard/Avatar";
import RequestStatusBadge from "./RequestStatusBadge";
import { leaveTypeLabel, leaveRequestEmployeeName, formatDateRange } from "./leaveTypeLabels";
import type { LeaveRequest } from "@/types";

/** Detail view for a single request, shown alongside the (shrunk) table
 * instead of a modal - review happens in place, with Approve/Reject at the
 * bottom, so switching between requests doesn't require re-opening a
 * dialog each time. */
export default function RequestDetailPanel({
  request,
  onClose,
  onReviewed,
}: {
  request: LeaveRequest;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const { settings } = useSettings();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState<"approved" | "rejected" | null>(null);
  const isPending = request.status === "pending";
  const employeeSubtitle =
    [request.employee?.designation, request.employee?.department].filter(Boolean).join(" · ") || "—";

  async function handleDecision(decision: "approved" | "rejected") {
    setSubmitting(decision);
    try {
      await api.post(`/leave-requests/${request._id}/${decision === "approved" ? "approve" : "reject"}`, { note });
      addToast({
        title: decision === "approved" ? "Request approved" : "Request rejected",
        description: `${leaveRequestEmployeeName(request.employee)} will be notified.`,
        severity: "success",
      });
      onReviewed();
    } catch (err) {
      addToast({
        title: "Couldn't submit review",
        description: getErrorMessage(err, "Something went wrong. Please try again."),
        severity: "danger",
      });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={leaveRequestEmployeeName(request.employee)} photoUrl={request.employee?.photoUrl ?? null} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{leaveRequestEmployeeName(request.employee)}</p>
            <p className="text-[11px] text-slate-400 truncate">{employeeSubtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200/80 p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-800">{leaveTypeLabel(request.type, settings.leaveTypes)}</p>
            <RequestStatusBadge status={request.status} />
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {formatDateRange(request.startDate, request.endDate)}
            <span className="text-slate-300">·</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {request.totalDays} day{request.totalDays === 1 ? "" : "s"}
          </p>
          {request.submittedByAdmin && <p className="text-[11px] text-slate-400">Submitted by admin</p>}
          {isPending && request.approvalStage === "manager" && (
            <p className="text-[11px] text-amber-600">Awaiting manager review (override available)</p>
          )}
          {isPending && request.approvalStage === "admin" && request.managerDecision === "approved" && (
            <p className="text-[11px] text-emerald-600">Manager approved - awaiting admin sign-off</p>
          )}
        </div>

        {request.reason && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Reason</p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{request.reason}</p>
          </div>
        )}

        {request.managerNote && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Manager's note</p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{request.managerNote}</p>
          </div>
        )}

        {!isPending && request.reviewNote && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Review note</p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{request.reviewNote}</p>
          </div>
        )}

        {isPending && (
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add a note for the employee..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {isPending && (
        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-200/80">
          <button
            type="button"
            onClick={() => handleDecision("approved")}
            disabled={submitting !== null}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5"
          >
            <Check className="w-4 h-4" />
            {submitting === "approved" ? "Approving..." : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => handleDecision("rejected")}
            disabled={submitting !== null}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5"
          >
            <XIcon className="w-4 h-4" />
            {submitting === "rejected" ? "Rejecting..." : "Reject"}
          </button>
        </div>
      )}
    </div>
  );
}
