import { useEffect, useState } from "react";
import { addToast } from "@heroui/react";
import { X, MapPin, Globe, CheckCircle2, PlusCircle, Clock } from "lucide-react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { osmEmbedUrl } from "@/components/LocationModal";
import type { AttendanceRecord } from "@/types";
import StatusBadge from "./StatusBadge";
import { displayStatus, formatTime, formatDuration } from "./statusUtils";

function TelemetryBlock({
  label,
  time,
  ip,
  latitude,
  longitude,
}: {
  label: string;
  time: string | null;
  ip: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="font-mono tabular-nums text-sm font-medium text-slate-900">{formatTime(time)}</p>
      </div>
      {!time ? (
        <p className="text-xs text-slate-400">Not recorded</p>
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
            <Globe className="w-3 h-3" />
            <span className="font-mono">{ip ?? "Not applicable (manual entry)"}</span>
          </div>
          {latitude !== null && longitude !== null ? (
            <div>
              <iframe
                title={`${label} location`}
                className="w-full h-32 rounded-lg border border-slate-200"
                src={osmEmbedUrl(latitude, longitude)}
              />
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-blue-600 hover:underline"
              >
                <MapPin className="w-3 h-3" />
                Open geofence location
              </a>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No geofence location recorded</p>
          )}
        </>
      )}
    </div>
  );
}

export default function AuditDrawer({
  open,
  onClose,
  employeeName,
  date,
  record,
  onResolved,
  onAddManualEntry,
  canResolve = true,
}: {
  open: boolean;
  onClose: () => void;
  employeeName: string;
  date: string;
  record: AttendanceRecord | null;
  onResolved: () => void;
  onAddManualEntry: () => void;
  /** Staff viewing their own history can see telemetry but shouldn't get
   * the admin-only resolve/backfill actions (the backend rejects them
   * anyway - this just avoids showing a control that would just 403). */
  canResolve?: boolean;
}) {
  const [note, setNote] = useState(record?.auditNote ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setNote(record?.auditNote ?? "");
  }, [record]);

  async function handleResolve() {
    if (!record) return;
    setSubmitting(true);
    try {
      await api.post(`/attendance/${record._id}/resolve`, { auditNote: note || null });
      addToast({ title: "Exception resolved", description: "The audit note was saved.", severity: "success" });
      onResolved();
    } catch (err) {
      addToast({
        title: "Couldn't resolve exception",
        description: getErrorMessage(err, "Something went wrong. Please try again."),
        severity: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const status = displayStatus(record);
  const isException = status !== "present";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/20 z-40 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Attendance audit detail"
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-200/80">
          <div>
            <p className="text-sm font-semibold text-slate-900">{employeeName}</p>
            <p className="text-xs text-slate-500 mt-0.5">{date}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</p>
            <StatusBadge status={status} />
          </div>

          {!record ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <Clock className="w-5 h-5 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No attendance record for this day</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {canResolve ? "Nothing was logged - add a manual entry if this needs backfilling." : "Nothing was logged for this day."}
              </p>
              {canResolve && (
                <button
                  type="button"
                  onClick={onAddManualEntry}
                  className="inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium px-3.5 py-2 rounded-lg"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add manual entry
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Shift duration</p>
                <span className="font-mono tabular-nums text-xs font-medium text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded">
                  {formatDuration(record.checkIn, record.checkOut)}
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Shift telemetry</p>
                <TelemetryBlock
                  label="Check-in"
                  time={record.checkIn}
                  ip={record.checkInIp}
                  latitude={record.checkInLatitude}
                  longitude={record.checkInLongitude}
                />
                <TelemetryBlock
                  label="Check-out"
                  time={record.checkOut}
                  ip={record.checkOutIp}
                  latitude={record.checkOutLatitude}
                  longitude={record.checkOutLongitude}
                />
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Audit note</p>
                {record.resolvedAt && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60 px-3 py-2 text-xs text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolved on {new Date(record.resolvedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                )}
                {canResolve ? (
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={isException ? "Explain what happened and how it was handled..." : "Optional note..."}
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  record.auditNote && <p className="text-sm text-slate-600">{record.auditNote}</p>
                )}
              </div>
            </>
          )}
        </div>

        {record && canResolve && (
          <div className="p-4 border-t border-slate-200/80">
            <button
              type="button"
              onClick={handleResolve}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? "Saving…" : record.resolvedAt ? "Update & Re-resolve" : "Approve & Resolve Exception"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
