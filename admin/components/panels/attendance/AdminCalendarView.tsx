import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core";
import api from "@/lib/axios";
import { toDateStr, todayStr, generateDateRange, isWeekend, hasJoinedBy } from "@/lib/dates";
import { employeeRefId } from "@/lib/employeeRef";
import { useSettings } from "@/lib/SettingsContext";
import PresentAbsentListModal from "./PresentAbsentListModal";
import type { AttendanceRecord, Employee } from "@/types";

export default function AdminCalendarView() {
  const { settings } = useSettings();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [dialog, setDialog] = useState<{ date: string; type: "present" | "absent" } | null>(null);

  useEffect(() => {
    api.get<{ employees: Employee[] }>("/employees").then((res) => {
      setEmployees(res.data.employees.filter((e) => e.active));
    });
  }, []);

  useEffect(() => {
    if (!range) return;
    api
      .get<{ records: AttendanceRecord[] }>("/attendance", {
        params: { from: range.start, to: range.end },
      })
      .then((res) => setRecords(res.data.records));
  }, [range]);

  const presentByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of records) {
      if (!r.checkIn) continue;
      const empId = employeeRefId(r.employee);
      if (!empId) continue; // employee since deleted
      if (!map.has(r.date)) map.set(r.date, new Set());
      map.get(r.date)!.add(empId);
    }
    return map;
  }, [records]);

  const today = todayStr();

  const events: EventInput[] = useMemo(() => {
    if (!range) return [];
    const evts: EventInput[] = [];
    for (const date of generateDateRange(range.start, range.end)) {
      if (date > today) continue;
      const presentCount = presentByDate.get(date)?.size ?? 0;
      const eligibleCount = employees.filter((e) => hasJoinedBy(e.createdAt, date)).length;
      const absentCount = Math.max(eligibleCount - presentCount, 0);

      if (presentCount > 0) {
        evts.push({
          id: `${date}-present`,
          title: `${presentCount} present`,
          start: date,
          allDay: true,
          backgroundColor: "#16a34a",
          borderColor: "#16a34a",
          textColor: "#ffffff",
          extendedProps: { date, type: "present" },
        });
      }
      // Weekends aren't expected workdays, so an empty one isn't "absence" -
      // only flag it if someone actually showed up (already handled above).
      if (absentCount > 0 && !isWeekend(date, settings.weekendDays)) {
        evts.push({
          id: `${date}-absent`,
          title: `${absentCount} absent`,
          start: date,
          allDay: true,
          backgroundColor: "#dc2626",
          borderColor: "#dc2626",
          textColor: "#ffffff",
          extendedProps: { date, type: "absent" },
        });
      }
    }
    return evts;
  }, [range, presentByDate, employees, today, settings.weekendDays]);

  function handleDatesSet(arg: DatesSetArg) {
    const endDate = new Date(arg.end);
    endDate.setDate(endDate.getDate() - 1);
    setRange({ start: toDateStr(arg.start), end: toDateStr(endDate) });
  }

  function handleEventClick(arg: EventClickArg) {
    const { date, type } = arg.event.extendedProps as { date: string; type: "present" | "absent" };
    setDialog({ date, type });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-600" /> Present
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Absent
        </span>
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height="auto"
        events={events}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
      />

      {dialog && (
        <PresentAbsentListModal
          isOpen
          onClose={() => setDialog(null)}
          date={dialog.date}
          type={dialog.type}
          employees={employees}
          records={records.filter((r) => r.date === dialog.date)}
        />
      )}
    </div>
  );
}
