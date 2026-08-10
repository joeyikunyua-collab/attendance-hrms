import { useState } from "react";
import { Skeleton } from "@/components/Skeleton";
import AdminCalendarView from "@/components/panels/attendance/AdminCalendarView";
import StaffCalendarView from "@/components/panels/attendance/StaffCalendarView";
import AttendanceDashboard from "@/components/panels/attendance/dashboard/AttendanceDashboard";
import { useCheckInOut } from "@/lib/useCheckInOut";
import type { AuthUser } from "@/types";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MyAttendanceView() {
  const { employee, record, loading: fetching, error, checkIn, checkOut } = useCheckInOut();

  if (fetching) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md">
        <Skeleton className="h-3.5 w-28 mb-2" />
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <Skeleton className="h-3.5 w-14 mb-1.5" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div>
            <Skeleton className="h-3.5 w-14 mb-1.5" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }
  if (error || !employee) {
    return <p className="text-sm text-red-600">{error ?? "Unable to load your employee record."}</p>;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md">
      <p className="text-sm text-slate-500 mb-1">{new Date().toDateString()}</p>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">{employee.name}</h2>

      <div className="flex items-center justify-between mb-4 text-sm">
        <div>
          <p className="text-slate-500">Check-in</p>
          <p className="font-medium text-slate-800">{formatTime(record?.checkIn ?? null)}</p>
        </div>
        <div>
          <p className="text-slate-500">Check-out</p>
          <p className="font-medium text-slate-800">{formatTime(record?.checkOut ?? null)}</p>
        </div>
      </div>

      {!record ? (
        <button
          onClick={checkIn}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md px-3 py-2"
        >
          Check in
        </button>
      ) : !record.checkOut ? (
        <button
          onClick={checkOut}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-md px-3 py-2"
        >
          Check out
        </button>
      ) : (
        <p className="text-center text-sm text-slate-400">Done for today</p>
      )}
    </div>
  );
}

function ListCalendarToggle({
  view,
  onChange,
}: {
  view: "list" | "calendar";
  onChange: (view: "list" | "calendar") => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        List
      </button>
      <button
        type="button"
        onClick={() => onChange("calendar")}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          view === "calendar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        Calendar
      </button>
    </div>
  );
}

export default function AttendancePanel({ user }: { user: AuthUser }) {
  const [view, setView] = useState<"list" | "calendar">("list");

  if (user.role === "admin") {
    if (view === "list") {
      return <AttendanceDashboard user={user} viewToggle={<ListCalendarToggle view={view} onChange={setView} />} />;
    }
    return (
      <div>
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-xl font-semibold text-slate-800">Today&apos;s Attendance</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{new Date().toDateString()}</span>
            <ListCalendarToggle view={view} onChange={setView} />
          </div>
        </div>
        <AdminCalendarView />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">My Attendance</h1>
        <ListCalendarToggle view={view} onChange={setView} />
      </div>
      {view === "list" ? <MyAttendanceView /> : <StaffCalendarView />}
    </div>
  );
}
