import { useEffect, useMemo, useState, type ReactNode } from "react";
import { addToast } from "@heroui/react";
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Search,
  Download,
  LayoutGrid,
  ListChecks,
  Inbox,
  Building2,
  Plus,
  ArrowRight,
} from "lucide-react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { employeeRefId, employeeRefName } from "@/lib/employeeRef";
import { getWeekDates } from "@/lib/dates";
import { dateGroupClass } from "@/components/DateFilterField";
import { TableSkeletonRows } from "@/components/Skeleton";
import type { AttendanceRecord, AuthUser, Employee } from "@/types";
import MetricCard from "./MetricCard";
import ViewSwitcher, { type ViewOption } from "./ViewSwitcher";
import StatusBadge, { type DisplayStatus } from "./StatusBadge";
import Avatar from "./Avatar";
import Pagination from "./Pagination";
import DateRangeField from "./DateRangeField";
import ManualTimeEntryModal from "./ManualTimeEntryModal";
import AuditDrawer from "./AuditDrawer";
import { displayStatus, durationMinutes, formatDuration, formatTime, EXCEPTION_STATUSES } from "./statusUtils";

type ViewKey = "summary" | "detailed" | "exception";

const PAGE_SIZE = 10;
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatHoursShort(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`;
}

function formatRangeLabel(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "2-digit", year: "numeric" };
  const f = new Date(`${from}T00:00:00`).toLocaleDateString(undefined, opts);
  const t = new Date(`${to}T00:00:00`).toLocaleDateString(undefined, opts);
  return `${f} – ${t}`;
}

interface Row {
  key: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  employeeRole: string;
  date: string;
  record: AttendanceRecord | null;
  days?: Record<string, AttendanceRecord | null>;
}

const VIEW_OPTIONS: ViewOption<ViewKey>[] = [
  {
    value: "summary",
    label: "Weekly Summary",
    description: "Default aggregate view of daily hours",
    icon: LayoutGrid,
  },
  {
    value: "detailed",
    label: "Detailed Time Logs",
    description: "Exact check-in / check-out timestamps",
    icon: ListChecks,
  },
  {
    value: "exception",
    label: "Exception Queue",
    description: "Missing checkouts, absences, and overtime",
    icon: Inbox,
  },
];

/** Drawer target: the specific employee/day being inspected. `record` is
 * resolved just-in-time from whatever dataset is already loaded for the
 * active view, so opening the drawer never needs its own network round trip. */
interface DrawerTarget {
  employeeId: string;
  employeeName: string;
  date: string;
  record: AttendanceRecord | null;
}

export default function AttendanceDashboard({ user, viewToggle }: { user: AuthUser; viewToggle?: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [fetchingToday, setFetchingToday] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  const [view, setView] = useState<ViewKey>("summary");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(todayStr());

  const [weeklyRecords, setWeeklyRecords] = useState<AttendanceRecord[]>([]);
  const [fetchingWeekly, setFetchingWeekly] = useState(false);

  const [detailedRecords, setDetailedRecords] = useState<AttendanceRecord[]>([]);
  const [detailedTotal, setDetailedTotal] = useState(0);
  const [fetchingDetailed, setFetchingDetailed] = useState(false);
  const [page, setPage] = useState(1);
  const [clientPage, setClientPage] = useState(1);

  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualEntryPrefill, setManualEntryPrefill] = useState<{ employeeId?: string; date?: string }>({});
  const [nudging, setNudging] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<DrawerTarget | null>(null);

  const fullWeekDates = useMemo(() => getWeekDates(), []);

  function loadOverview() {
    setFetchingToday(true);
    setLoadError(null);
    Promise.all([
      api.get<{ employees: Employee[] }>("/employees"),
      api.get<{ records: AttendanceRecord[] }>("/attendance", { params: { date: todayStr() } }),
    ])
      .then(([empRes, attRes]) => {
        setEmployees(empRes.data.employees);
        setTodayRecords(attRes.data.records);
      })
      .catch((err) => setLoadError(getErrorMessage(err, "Failed to load attendance data.")))
      .finally(() => setFetchingToday(false));
  }

  function loadWeekly() {
    setFetchingWeekly(true);
    api
      .get<{ records: AttendanceRecord[] }>("/attendance", { params: { from: fullWeekDates[0], to: todayStr() } })
      .then((res) => setWeeklyRecords(res.data.records))
      .finally(() => setFetchingWeekly(false));
  }

  function loadDetailed(targetPage: number, rangeFrom = from, rangeTo = to) {
    setFetchingDetailed(true);
    api
      .get<{ records: AttendanceRecord[]; total: number }>("/attendance", {
        params: { from: rangeFrom, to: rangeTo, limit: PAGE_SIZE, skip: (targetPage - 1) * PAGE_SIZE },
      })
      .then((res) => {
        setDetailedRecords(res.data.records);
        setDetailedTotal(res.data.total ?? 0);
        setPage(targetPage);
      })
      .finally(() => setFetchingDetailed(false));
  }

  // Live system status - a real heartbeat against the API, not a static badge.
  useEffect(() => {
    let cancelled = false;
    function ping() {
      api
        .get("/health")
        .then(() => !cancelled && setApiHealthy(true))
        .catch(() => !cancelled && setApiHealthy(false));
    }
    ping();
    const interval = setInterval(ping, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    loadOverview();
    loadWeekly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (view === "detailed" && detailedRecords.length === 0) loadDetailed(1);
    setClientPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Filtering can shrink the result set out from under the current page -
  // land back on page 1 rather than showing a stale, possibly-empty page.
  useEffect(() => {
    setClientPage(1);
  }, [search, department]);

  const recordByEmployee = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of todayRecords) {
      const id = employeeRefId(r.employee);
      if (id) map.set(id, r);
    }
    return map;
  }, [todayRecords]);

  const weeklyByEmployee = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    for (const r of weeklyRecords) {
      const id = employeeRefId(r.employee);
      if (!id) continue;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(r);
    }
    return map;
  }, [weeklyRecords]);

  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees]);
  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(),
    [employees]
  );

  const checkedInToday = useMemo(() => todayRecords.filter((r) => r.checkIn).length, [todayRecords]);
  const notCheckedInEmployees = useMemo(
    () => activeEmployees.filter((e) => !recordByEmployee.get(e._id)),
    [activeEmployees, recordByEmployee]
  );
  const missingCheckouts = useMemo(
    () => todayRecords.filter((r) => displayStatus(r) === "incomplete").length,
    [todayRecords]
  );

  const matchesSearchAndDept = (name: string, dept: string) => {
    const query = search.trim().toLowerCase();
    if (query && !name.toLowerCase().includes(query)) return false;
    if (department && dept !== department) return false;
    return true;
  };

  const rows: Row[] = useMemo(() => {
    if (view === "detailed") {
      return detailedRecords
        .filter((r) =>
          matchesSearchAndDept(
            employeeRefName(r.employee),
            typeof r.employee === "object" && r.employee ? r.employee.department : ""
          )
        )
        .map((r) => ({
          key: r._id,
          employeeId: employeeRefId(r.employee) ?? "",
          employeeName: employeeRefName(r.employee),
          employeeCode: typeof r.employee === "object" && r.employee ? r.employee.employeeId : "",
          employeeRole: typeof r.employee === "object" && r.employee ? r.employee.designation : "",
          date: r.date,
          record: r,
        }));
    }

    if (view === "exception") {
      return activeEmployees
        .filter((e) => matchesSearchAndDept(e.name, e.department))
        .map((e) => ({
          key: e._id,
          employeeId: e._id,
          employeeName: e.name,
          employeeCode: e.employeeId,
          employeeRole: e.designation,
          date: todayStr(),
          record: recordByEmployee.get(e._id) ?? null,
        }))
        .filter((row) => EXCEPTION_STATUSES.includes(displayStatus(row.record)));
    }

    return activeEmployees
      .filter((e) => matchesSearchAndDept(e.name, e.department))
      .map((e) => {
        const records = weeklyByEmployee.get(e._id) ?? [];
        const days: Record<string, AttendanceRecord | null> = {};
        for (const d of fullWeekDates) {
          days[d] = records.find((r) => r.date === d) ?? null;
        }
        return {
          key: e._id,
          employeeId: e._id,
          employeeName: e.name,
          employeeCode: e.employeeId,
          employeeRole: e.designation,
          date: todayStr(),
          record: recordByEmployee.get(e._id) ?? null,
          days,
        };
      });
  }, [view, detailedRecords, activeEmployees, recordByEmployee, weeklyByEmployee, fullWeekDates, search, department]);

  const isServerPaginated = view === "detailed";
  const visibleRows = isServerPaginated ? rows : rows.slice((clientPage - 1) * PAGE_SIZE, clientPage * PAGE_SIZE);
  const visibleTotal = isServerPaginated ? detailedTotal : rows.length;
  const visiblePage = isServerPaginated ? page : clientPage;

  function openDrawer(target: DrawerTarget) {
    setDrawerTarget(target);
  }

  function openManualEntryFromDrawer() {
    if (!drawerTarget) return;
    setManualEntryPrefill({ employeeId: drawerTarget.employeeId, date: drawerTarget.date });
    setDrawerTarget(null);
    setManualEntryOpen(true);
  }

  async function handleNudgeAll() {
    const targets = notCheckedInEmployees.filter((e) => e.user);
    if (targets.length === 0) return;
    setNudging(true);
    const results = await Promise.allSettled(targets.map((e) => api.post(`/notifications/nudge/${e._id}`)));
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    setNudging(false);
    addToast({
      title: succeeded > 0 ? "Nudges sent" : "Nudges failed",
      description: `Notified ${succeeded} of ${targets.length} employee${targets.length === 1 ? "" : "s"}.`,
      severity: succeeded > 0 ? "success" : "danger",
    });
  }

  function refreshAll() {
    loadOverview();
    loadWeekly();
    if (view === "detailed") loadDetailed(page);
    setDrawerTarget(null);
  }

  function exportCsv() {
    const header = ["Employee ID", "Name", "Date", "Check-in", "Check-out", "Duration", "Status"];
    const lines = rows.map((row) =>
      [
        row.employeeCode,
        row.employeeName,
        row.date,
        formatTime(row.record?.checkIn ?? null),
        formatTime(row.record?.checkOut ?? null),
        formatDuration(row.record?.checkIn ?? null, row.record?.checkOut ?? null),
        displayStatus(row.record),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${view}-${todayStr()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast({ title: "Export ready", description: `${rows.length} rows downloaded as CSV.`, severity: "success" });
  }

  const isTableLoading = view === "detailed" ? fetchingDetailed : view === "summary" ? fetchingToday || fetchingWeekly : fetchingToday;
  const columnCount = view === "summary" ? 10 : view === "detailed" ? 7 : 6;

  return (
    <div className="bg-[#F8FAFC] -m-4 p-4 sm:-m-6 sm:p-6 rounded-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Attendance Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                {apiHealthy !== false && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    apiHealthy === false ? "bg-red-500" : "bg-emerald-500"
                  }`}
                />
              </span>
              <span className="text-[11px] font-medium text-slate-600">
                {apiHealthy === false ? "System Unreachable" : "System Operational"}
              </span>
            </span>
          </div>
          <p className="text-xs font-normal text-slate-500 mt-0.5">
            Real-time shift logs, geofence check-ins, and automated exception queues
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {viewToggle}
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3.5 py-2 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setManualEntryPrefill({});
              setManualEntryOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium px-3.5 py-2 rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Manual Time Entry
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Employees" value={fetchingToday ? "—" : activeEmployees.length} icon={Users} tone="blue" />
        <MetricCard
          label="Checked In Today"
          value={fetchingToday ? "—" : checkedInToday}
          helperText={
            fetchingToday || activeEmployees.length === 0
              ? undefined
              : `${Math.round((checkedInToday / activeEmployees.length) * 100)}% of active staff`
          }
          icon={UserCheck}
          tone="emerald"
        />
        <MetricCard
          label="Not Checked In"
          value={fetchingToday ? "—" : notCheckedInEmployees.length}
          icon={UserX}
          tone="slate"
          action={
            !fetchingToday && notCheckedInEmployees.length > 0 ? (
              <button
                type="button"
                onClick={handleNudgeAll}
                disabled={nudging}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-60"
              >
                {nudging ? "Sending…" : "Nudge All"}
              </button>
            ) : undefined
          }
        />
        <MetricCard
          label="Requires Action"
          value={fetchingToday ? "—" : missingCheckouts}
          helperText={!fetchingToday && missingCheckouts > 0 ? "Missing checkouts" : undefined}
          icon={AlertTriangle}
          tone="red"
        />
      </div>

      {/* View switcher */}
      <div className="mb-6">
        <ViewSwitcher options={VIEW_OPTIONS} value={view} onChange={setView} />
      </div>

      {/* Table container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-end gap-3 p-4 border-b border-slate-200/80">
          <div className="w-72 max-w-full">
            <label className="block text-xs text-slate-500 mb-1" htmlFor="attendance-search">
              Search
            </label>
            <div className={dateGroupClass}>
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                id="attendance-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee name or ID..."
                className="flex-1 outline-none bg-transparent text-sm"
              />
            </div>
          </div>

          <div className="w-44">
            <label className="block text-xs text-slate-500 mb-1" htmlFor="attendance-department">
              Department
            </label>
            <div className={dateGroupClass}>
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                id="attendance-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="flex-1 outline-none bg-transparent text-sm text-slate-700"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {view === "detailed" && (
            <div className="ml-auto">
              <DateRangeField
                from={from}
                to={to}
                onApply={(newFrom, newTo) => {
                  setFrom(newFrom);
                  setTo(newTo);
                  loadDetailed(1, newFrom, newTo);
                }}
              />
            </div>
          )}
          {view !== "detailed" && (
            <span className="ml-auto text-xs font-medium text-slate-500">
              {view === "summary" ? formatRangeLabel(fullWeekDates[0], fullWeekDates[6]) : todayStr()}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-left">
              <tr>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                {view === "summary" &&
                  fullWeekDates.map((d, i) => (
                    <th
                      key={d}
                      className={`py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-center ${
                        d === todayStr() ? "bg-blue-50/30 text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {WEEKDAY_LABELS[i]}
                    </th>
                  ))}
                {view === "detailed" && (
                  <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date</th>
                )}
                {view !== "summary" && (
                  <>
                    <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Check-in</th>
                    <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Check-out</th>
                    <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Duration</th>
                  </>
                )}
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isTableLoading ? (
                <TableSkeletonRows columns={columnCount} />
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={columnCount}>
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.employeeName} size="sm" />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              openDrawer({
                                employeeId: row.employeeId,
                                employeeName: row.employeeName,
                                date: row.date,
                                record: row.record,
                              })
                            }
                            disabled={!row.employeeId}
                            className="block text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors truncate disabled:cursor-default disabled:hover:text-slate-900"
                          >
                            {row.employeeName}
                          </button>
                          <p className="text-[11px] text-slate-400 truncate">
                            {row.employeeRole || "—"} <span className="font-mono">· {row.employeeCode}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {view === "summary" &&
                      row.days &&
                      fullWeekDates.map((d) => {
                        const dayRecord = row.days![d];
                        const isFuture = d > todayStr();
                        const isToday = d === todayStr();
                        const minutes = dayRecord ? durationMinutes(dayRecord.checkIn, dayRecord.checkOut) : null;
                        return (
                          <td
                            key={d}
                            className={`px-3 py-3 text-center ${isToday ? "bg-blue-50/30" : ""}`}
                          >
                            <button
                              type="button"
                              disabled={isFuture}
                              onClick={() =>
                                openDrawer({
                                  employeeId: row.employeeId,
                                  employeeName: row.employeeName,
                                  date: d,
                                  record: dayRecord,
                                })
                              }
                              className={`w-full rounded-md py-1 text-xs font-mono tabular-nums transition-colors ${
                                isFuture
                                  ? "text-slate-300 cursor-default"
                                  : !dayRecord
                                  ? "text-slate-300 hover:bg-slate-100"
                                  : !dayRecord.checkOut
                                  ? "text-amber-600 font-bold hover:bg-amber-50"
                                  : `text-slate-700 hover:bg-slate-100 ${isToday ? "font-semibold text-slate-900" : ""}`
                              }`}
                            >
                              {isFuture ? "—" : !dayRecord ? "—" : !dayRecord.checkOut ? "IN" : formatHoursShort(minutes ?? 0)}
                            </button>
                          </td>
                        );
                      })}

                    {view === "detailed" && (
                      <td className="px-4 py-3 text-xs font-normal text-slate-500 font-mono tabular-nums">{row.date}</td>
                    )}
                    {view !== "summary" && (
                      <>
                        <td className="px-4 py-3 text-xs font-normal text-slate-500 font-mono tabular-nums">
                          {formatTime(row.record?.checkIn ?? null)}
                        </td>
                        <td className="px-4 py-3 text-xs font-normal text-slate-500 font-mono tabular-nums">
                          {formatTime(row.record?.checkOut ?? null)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono tabular-nums text-xs font-medium text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded">
                            {formatDuration(row.record?.checkIn ?? null, row.record?.checkOut ?? null)}
                          </span>
                        </td>
                      </>
                    )}

                    <td className="px-4 py-3">
                      <StatusBadge status={displayStatus(row.record)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          openDrawer({
                            employeeId: row.employeeId,
                            employeeName: row.employeeName,
                            date: row.date,
                            record: row.record,
                          })
                        }
                        disabled={!row.employeeId}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600"
                      >
                        Inspect
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={visiblePage}
          pageSize={PAGE_SIZE}
          total={visibleTotal}
          onPageChange={isServerPaginated ? (p) => loadDetailed(p) : setClientPage}
        />
      </div>

      <ManualTimeEntryModal
        isOpen={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        employees={activeEmployees}
        onSaved={refreshAll}
        initialEmployeeId={manualEntryPrefill.employeeId}
        initialDate={manualEntryPrefill.date}
      />

      <AuditDrawer
        open={!!drawerTarget}
        onClose={() => setDrawerTarget(null)}
        employeeName={drawerTarget?.employeeName ?? ""}
        date={drawerTarget?.date ?? ""}
        record={drawerTarget?.record ?? null}
        onResolved={refreshAll}
        onAddManualEntry={openManualEntryFromDrawer}
      />
    </div>
  );
}
