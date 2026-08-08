import { useEffect, useState, type ReactNode } from "react";
import Layout from "@/components/Layout";
import DateFilterField from "@/components/DateFilterField";
import EmployeeDayDetailModal from "@/components/EmployeeDayDetailModal";
import NavTabs from "@/components/NavTabs";
import { Skeleton, TableSkeletonRows } from "@/components/Skeleton";
import AttendancePanel from "@/components/panels/AttendancePanel";
import AttendanceAnalytics from "@/components/panels/attendance/dashboard/AttendanceAnalytics";
import AnnouncementsFeed from "@/components/panels/announcements/AnnouncementsFeed";
import CelebrationsWidget from "@/components/panels/celebrations/CelebrationsWidget";
import EmployeesPanel from "@/components/panels/EmployeesPanel";
import ReportsPanel from "@/components/panels/ReportsPanel";
import LoginActivityPanel from "@/components/panels/LoginActivityPanel";
import { useAuth } from "@/lib/useAuth";
import api from "@/lib/axios";
import { ADMIN_NAV_LINKS, STAFF_NAV_LINKS } from "@/lib/navLinks";
import { todayStr, addDays, generateDateRange, getWeekDates, isWeekend, toDateStr, laterDateStr } from "@/lib/dates";
import { employeeRefId } from "@/lib/employeeRef";
import type { AttendanceRecord, AuthUser, Employee } from "@/types";

function weekdayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" });
}

function shortDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** Re-renders every `intervalMs` so in-progress durations keep ticking upward. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const STAT_ICON_PATHS = {
  users: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
  checkCircle: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  calendar:
    "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
};

const STAT_COLOR_CLASSES = {
  slate: { icon: "bg-slate-100 text-slate-600", value: "text-slate-800" },
  green: { icon: "bg-green-100 text-green-600", value: "text-green-600" },
  amber: { icon: "bg-amber-100 text-amber-600", value: "text-amber-600" },
  blue: { icon: "bg-blue-100 text-blue-600", value: "text-blue-600" },
};

function StatCard({
  label,
  value,
  color,
  icon,
  loading,
}: {
  label: string;
  value: ReactNode;
  color: keyof typeof STAT_COLOR_CLASSES;
  icon: keyof typeof STAT_ICON_PATHS;
  loading: boolean;
}) {
  const colors = STAT_COLOR_CLASSES[color];
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${colors.icon}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d={STAT_ICON_PATHS[icon]} />
        </svg>
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        {loading ? (
          <Skeleton className="h-7 w-10 mt-1" />
        ) : (
          <p className={`text-2xl font-semibold ${colors.value}`}>{value}</p>
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ user }: { user: AuthUser }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [rangeStart, setRangeStart] = useState(() => getWeekDates()[0]);
  const [rangeEnd, setRangeEnd] = useState(() => getWeekDates()[6]);

  useEffect(() => {
    setFetching(true);
    Promise.all([
      api.get<{ employees: Employee[] }>("/employees"),
      api.get<{ records: AttendanceRecord[] }>("/attendance", {
        params: { from: rangeStart, to: rangeEnd },
      }),
    ])
      .then(([empRes, attRes]) => {
        setEmployees(empRes.data.employees);
        setRecords(attRes.data.records);
      })
      .finally(() => {
        setFetching(false);
        setInitialLoading(false);
      });
  }, [rangeStart, rangeEnd]);

  const now = useNow(30000);
  const today = todayStr();
  const rangeDates = generateDateRange(rangeStart, rangeEnd);

  const activeEmployees = employees.filter((e) => e.active);
  const todaysRecords = records.filter((r) => r.date === today);
  const checkedIn = todaysRecords.filter((r) => r.checkIn).length;
  const stillOut = activeEmployees.length - checkedIn;

  const recordByEmployeeAndDate = new Map<string, AttendanceRecord>();
  for (const r of records) {
    const empId = employeeRefId(r.employee);
    if (!empId) continue; // employee since deleted - can't attribute this record to anyone
    recordByEmployeeAndDate.set(`${empId}|${r.date}`, r);
  }

  function timeAtWorkFor(employeeId: string, date: string) {
    const record = recordByEmployeeAndDate.get(`${employeeId}|${date}`);
    if (!record || !record.checkIn) return { label: "—", inProgress: false };

    const checkIn = new Date(record.checkIn).getTime();
    if (record.checkOut) {
      return {
        label: formatDuration(new Date(record.checkOut).getTime() - checkIn),
        inProgress: false,
      };
    }
    if (date === today) {
      return { label: formatDuration(now - checkIn), inProgress: true };
    }
    return { label: "Incomplete", inProgress: false };
  }

  function goToPreviousWeek() {
    setRangeStart((s) => addDays(s, -7));
    setRangeEnd((e) => addDays(e, -7));
  }

  function goToNextWeek() {
    setRangeStart((s) => addDays(s, 7));
    setRangeEnd((e) => addDays(e, 7));
  }

  function goToThisWeek() {
    const week = getWeekDates();
    setRangeStart(week[0]);
    setRangeEnd(week[6]);
  }

  const selectedDays = selectedEmployee
    ? rangeDates.map((date) => {
        const record = recordByEmployeeAndDate.get(`${selectedEmployee._id}|${date}`);
        return {
          date,
          checkIn: formatTime(record?.checkIn ?? null),
          checkOut: formatTime(record?.checkOut ?? null),
          notes: record?.notes,
        };
      })
    : [];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <AnnouncementsFeed user={user} />
        </div>
        <CelebrationsWidget />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Active employees"
          value={activeEmployees.length}
          color="slate"
          icon="users"
          loading={initialLoading}
        />
        <StatCard
          label="Checked in today"
          value={checkedIn}
          color="green"
          icon="checkCircle"
          loading={initialLoading}
        />
        <StatCard
          label="Not yet checked in"
          value={Math.max(stillOut, 0)}
          color="amber"
          icon="clock"
          loading={initialLoading}
        />
      </div>

      <div className="mb-6">
        <AttendanceAnalytics />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">Time at Work</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousWeek}
                className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md px-2 py-1.5"
              >
                ‹ Prev week
              </button>
              <button
                onClick={goToThisWeek}
                className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md px-2 py-1.5"
              >
                This week
              </button>
              <button
                onClick={goToNextWeek}
                className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md px-2 py-1.5"
              >
                Next week ›
              </button>
            </div>
            <DateFilterField label="From" value={rangeStart} onChange={setRangeStart} />
            <DateFilterField label="To" value={rangeEnd} onChange={setRangeEnd} />
          </div>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                  Name
                </th>
                {rangeDates.map((date) => (
                  <th
                    key={date}
                    className={`px-4 py-3 whitespace-nowrap ${
                      date === today ? "bg-blue-100 text-blue-700" : ""
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide">
                      {weekdayLabel(date)}
                    </div>
                    <div className="text-xs font-normal normal-case text-slate-400">
                      {shortDateLabel(date)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fetching ? (
                <TableSkeletonRows columns={rangeDates.length + 1} />
              ) : activeEmployees.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={rangeDates.length + 1}>
                    No active employees.
                  </td>
                </tr>
              ) : (
                activeEmployees.map((emp) => (
                  <tr
                    key={emp._id}
                    onClick={() => setSelectedEmployee(emp)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-blue-600 hover:underline">
                      {emp.name}
                    </td>
                    {rangeDates.map((date) => {
                      const cell = timeAtWorkFor(emp._id, date);
                      return (
                        <td
                          key={date}
                          className={`px-4 py-3 whitespace-nowrap text-slate-600 ${
                            date === today ? "bg-blue-50" : ""
                          }`}
                        >
                          {cell.label}
                          {cell.inProgress && <span className="ml-1 text-xs text-green-600">•</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployee && (
        <EmployeeDayDetailModal
          isOpen
          onClose={() => setSelectedEmployee(null)}
          employeeName={selectedEmployee.name}
          days={selectedDays}
        />
      )}
    </>
  );
}

function StaffDashboard({ user, onGoToAttendance }: { user: AuthUser; onGoToAttendance: () => void }) {
  const [weekRecords, setWeekRecords] = useState<AttendanceRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [joinDate, setJoinDate] = useState<string | null>(null);

  const today = todayStr();

  useEffect(() => {
    const weekStart = getWeekDates()[0];
    Promise.all([
      api.get<{ records: AttendanceRecord[] }>("/attendance", { params: { from: weekStart, to: today } }),
      api.get<{ employee: Employee }>("/employees/me"),
    ])
      .then(([recordsRes, meRes]) => {
        setWeekRecords(recordsRes.data.records);
        setJoinDate(toDateStr(new Date(meRes.data.employee.createdAt)));
      })
      .finally(() => setInitialLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = useNow(30000);
  const record = weekRecords.find((r) => r.date === today) ?? null;

  const checkInTime = formatTime(record?.checkIn ?? null);
  const checkOutTime = formatTime(record?.checkOut ?? null);

  let status: string;
  if (checkOutTime) status = `Checked out at ${checkOutTime}`;
  else if (checkInTime) status = `Checked in at ${checkInTime}`;
  else status = "Not checked in yet";

  const timeAtWork = record?.checkIn
    ? formatDuration(
        (record.checkOut ? new Date(record.checkOut).getTime() : now) -
          new Date(record.checkIn).getTime()
      )
    : null;

  const weekStart = joinDate ? laterDateStr(getWeekDates()[0], joinDate) : getWeekDates()[0];
  const daysElapsed = generateDateRange(weekStart, today).filter((d) => !isWeekend(d)).length;
  const daysPresent = weekRecords.filter((r) => r.checkIn).length;
  const weekMs = weekRecords.reduce((total, r) => {
    if (!r.checkIn) return total;
    const start = new Date(r.checkIn).getTime();
    if (r.checkOut) return total + (new Date(r.checkOut).getTime() - start);
    if (r.date === today) return total + (now - start);
    return total;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md">
        <p className="text-sm text-slate-500 mb-1">Welcome back</p>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">{user.name}</h2>
        {initialLoading ? (
          <>
            <Skeleton className="h-4 w-40 mb-1" />
            <Skeleton className="h-4 w-36 mb-4" />
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-1">{status}</p>
            {timeAtWork && (
              <p className="text-sm text-slate-500 mb-1">
                Time at work: <span className="font-medium text-slate-800">{timeAtWork}</span>
                {!checkOutTime && <span className="ml-2 text-xs text-green-600">in progress</span>}
              </p>
            )}
          </>
        )}
        <button
          onClick={onGoToAttendance}
          className="inline-block mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md px-4 py-2"
        >
          Go to My Attendance
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AnnouncementsFeed user={user} />
        </div>
        <CelebrationsWidget />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Time at work today"
          value={timeAtWork ?? "—"}
          color="blue"
          icon="clock"
          loading={initialLoading}
        />
        <StatCard
          label="Days present this week"
          value={`${daysPresent} / ${daysElapsed}`}
          color="green"
          icon="calendar"
          loading={initialLoading}
        />
        <StatCard
          label="Hours this week"
          value={formatDuration(weekMs)}
          color="amber"
          icon="clock"
          loading={initialLoading}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (loading || !user) return null;

  const tabs = user.role === "admin" ? ADMIN_NAV_LINKS : STAFF_NAV_LINKS;

  return (
    <Layout user={user}>
      <NavTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "dashboard" && (
        <>
          <h1 className="text-xl font-semibold text-slate-800 mb-1">Dashboard</h1>
          <p className="text-sm text-slate-500 mb-4">{new Date().toDateString()}</p>
          {user.role === "admin" ? (
            <AdminDashboard user={user} />
          ) : (
            <StaffDashboard user={user} onGoToAttendance={() => setActiveTab("attendance")} />
          )}
        </>
      )}
      {activeTab === "attendance" && <AttendancePanel user={user} />}
      {activeTab === "employees" && user.role === "admin" && <EmployeesPanel />}
      {activeTab === "reports" && <ReportsPanel user={user} />}
      {activeTab === "login-activity" && user.role === "admin" && <LoginActivityPanel />}
    </Layout>
  );
}
