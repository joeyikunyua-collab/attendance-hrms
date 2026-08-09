import type { AttendanceRecord } from "@/types";
import type { DisplayStatus } from "./StatusBadge";

export const OVERTIME_THRESHOLD_MINUTES = 8 * 60;

export function durationMinutes(checkIn: string | null, checkOut: string | null): number | null {
  if (!checkIn || !checkOut) return null;
  return Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000));
}

export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatDuration(checkIn: string | null, checkOut: string | null) {
  const minutes = durationMinutes(checkIn, checkOut);
  return minutes === null ? "—" : formatMinutes(minutes);
}

export function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** "Present" is derived (not just whatever the record's own `status` field
 * says) so a long shift with no explicit status still surfaces as an
 * overtime exception, and a checked-in-but-not-out record always reads as
 * "incomplete" regardless of its stored status. `overtimeThresholdMinutes`
 * defaults to the built-in constant but callers should pass the live value
 * from Settings (useSettings().settings.overtimeThresholdMinutes). */
export function displayStatus(
  record: AttendanceRecord | null,
  overtimeThresholdMinutes: number = OVERTIME_THRESHOLD_MINUTES
): DisplayStatus {
  if (!record) return "absent";
  if (record.status === "late") return "late";
  if (record.status === "absent") return "absent";
  if (!record.checkOut) return "incomplete";
  const minutes = durationMinutes(record.checkIn, record.checkOut);
  if (minutes !== null && minutes > overtimeThresholdMinutes) return "overtime";
  return "present";
}

/** What the Exception Queue view surfaces: missing checkouts, unscheduled
 * absences, and overtime. "Late" isn't an exception on its own here - the
 * employee still showed up and worked a full day. */
export const EXCEPTION_STATUSES: DisplayStatus[] = ["incomplete", "absent", "overtime"];
