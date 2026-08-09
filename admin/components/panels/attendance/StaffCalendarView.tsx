import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core";
import api from "@/lib/axios";
import { toDateStr, todayStr, generateDateRange, isWeekend, hasJoinedBy } from "@/lib/dates";
import { useSettings } from "@/lib/SettingsContext";
import DayActivityModal from "./DayActivityModal";
import type { AttendanceRecord, Employee } from "@/types";

export default function StaffCalendarView() {
  const { settings } = useSettings();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [me, setMe] = useState<Employee | null>(null);

  useEffect(() => {
    api.get<{ employee: Employee }>("/employees/me").then((res) => setMe(res.data.employee));
  }, []);

  useEffect(() => {
    if (!range) return;
    api
      .get<{ records: AttendanceRecord[] }>("/attendance", {
        params: { from: range.start, to: range.end },
      })
      .then((res) => setRecords(res.data.records));
  }, [range]);

  const recordByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of records) map.set(r.date, r);
    return map;
  }, [records]);

  const today = todayStr();

  const events: EventInput[] = useMemo(() => {
    if (!range || !me) return []; // wait for the join date - otherwise pre-join days flash "Absent"
    const evts: EventInput[] = [];
    for (const date of generateDateRange(range.start, range.end)) {
      if (date > today) continue;
      if (!hasJoinedBy(me.createdAt, date)) continue; // before this employee existed
      const present = !!recordByDate.get(date)?.checkIn;
      if (!present && isWeekend(date, settings.weekendDays)) continue; // not an expected workday - no badge either way
      evts.push({
        id: date,
        title: present ? "Present" : "Absent",
        start: date,
        allDay: true,
        backgroundColor: present ? "#16a34a" : "#dc2626",
        borderColor: present ? "#16a34a" : "#dc2626",
        textColor: "#ffffff",
        extendedProps: { date },
      });
    }
    return evts;
  }, [range, recordByDate, today, me, settings.weekendDays]);

  function handleDatesSet(arg: DatesSetArg) {
    const endDate = new Date(arg.end);
    endDate.setDate(endDate.getDate() - 1);
    setRange({ start: toDateStr(arg.start), end: toDateStr(endDate) });
  }

  function handleEventClick(arg: EventClickArg) {
    const { date } = arg.event.extendedProps as { date: string };
    setSelectedDate(date);
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

      {selectedDate && (
        <DayActivityModal
          isOpen
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          record={recordByDate.get(selectedDate) ?? null}
        />
      )}
    </div>
  );
}
