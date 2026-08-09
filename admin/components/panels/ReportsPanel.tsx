import { useEffect, useMemo, useState } from "react";
import { addToast } from "@heroui/react";
import {
  Search,
  Building2,
  Download,
  FileText,
  CalendarClock,
  ListChecks,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { employeeRefName } from "@/lib/employeeRef";
import { useSettings } from "@/lib/SettingsContext";
import { dateGroupClass } from "@/components/DateFilterField";
import { TableSkeletonRows } from "@/components/Skeleton";
import Avatar from "@/components/panels/attendance/dashboard/Avatar";
import AttendanceAnalytics from "@/components/panels/attendance/dashboard/AttendanceAnalytics";
import MetricCard from "@/components/panels/attendance/dashboard/MetricCard";
import Pagination from "@/components/panels/attendance/dashboard/Pagination";
import DateRangeField from "@/components/panels/attendance/dashboard/DateRangeField";
import AuditDrawer from "@/components/panels/attendance/dashboard/AuditDrawer";
import ManualTimeEntryModal from "@/components/panels/attendance/dashboard/ManualTimeEntryModal";
import {
  displayStatus,
  durationMinutes,
  formatDuration,
  formatMinutes,
  formatTime,
} from "@/components/panels/attendance/dashboard/statusUtils";
import type { DisplayStatus } from "@/components/panels/attendance/dashboard/StatusBadge";
import ComplianceBadge from "@/components/panels/reports/ComplianceBadge";
import ScheduleDeliveryModal from "@/components/panels/reports/ScheduleDeliveryModal";
import type { AttendanceRecord, AuthUser, Employee } from "@/types";

const PAGE_SIZE = 10;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** The immediately-preceding period of the same length, for the "vs last
 * period" completion-rate trend - e.g. Aug 01-08 compares against Jul 24-31. */
function previousPeriod(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  const rangeDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  const prevTo = new Date(fromDate);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (rangeDays - 1));
  return { prevFrom: prevFrom.toISOString().slice(0, 10), prevTo: prevTo.toISOString().slice(0, 10) };
}

const STATUS_FILTER_OPTIONS: { value: DisplayStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "present", label: "Completed" },
  { value: "incomplete", label: "Missing Check-out" },
  { value: "overtime", label: "Overtime" },
];

export default function ReportsPanel({ user }: { user: AuthUser }) {
  const isAdmin = user.role === "admin";
  const { settings } = useSettings();
  const overtimeThresholdMinutes = settings.overtimeThresholdMinutes;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(todayStr());
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | "">("");

  const [rangeRecords, setRangeRecords] = useState<AttendanceRecord[]>([]);
  const [prevRangeRecords, setPrevRangeRecords] = useState<AttendanceRecord[]>([]);
  const [fetchingRange, setFetchingRange] = useState(true);

  const [pageRecords, setPageRecords] = useState<AttendanceRecord[]>([]);
  const [pageTotal, setPageTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fetchingPage, setFetchingPage] = useState(true);

  const [drawerTarget, setDrawerTarget] = useState<{ id: string; name: string; date: string; record: AttendanceRecord } | null>(
    null
  );
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualEntryPrefill, setManualEntryPrefill] = useState<{ employeeId?: string; date?: string }>({});
  const [scheduleOpen, setScheduleOpen] = useState(false);

  function loadRange(rangeFrom: string, rangeTo: string) {
    setFetchingRange(true);
    const { prevFrom, prevTo } = previousPeriod(rangeFrom, rangeTo);
    Promise.all([
      api.get<{ records: AttendanceRecord[] }>("/attendance", { params: { from: rangeFrom, to: rangeTo } }),
      api.get<{ records: AttendanceRecord[] }>("/attendance", { params: { from: prevFrom, to: prevTo } }),
    ])
      .then(([curRes, prevRes]) => {
        setRangeRecords(curRes.data.records);
        setPrevRangeRecords(prevRes.data.records);
      })
      .finally(() => setFetchingRange(false));
  }

  function loadPage(targetPage: number, rangeFrom = from, rangeTo = to) {
    setFetchingPage(true);
    api
      .get<{ records: AttendanceRecord[]; total: number }>("/attendance", {
        params: { from: rangeFrom, to: rangeTo, limit: PAGE_SIZE, skip: (targetPage - 1) * PAGE_SIZE },
      })
      .then((res) => {
        setPageRecords(res.data.records);
        setPageTotal(res.data.total ?? 0);
        setPage(targetPage);
      })
      .finally(() => setFetchingPage(false));
  }

  useEffect(() => {
    if (isAdmin) {
      api.get<{ employees: Employee[] }>("/employees").then((res) => setEmployees(res.data.employees));
    }
    loadRange(from, to);
    loadPage(1, from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(),
    [employees]
  );

  const matchesSearchAndDept = (r: AttendanceRecord) => {
    const name = employeeRefName(r.employee);
    const dept = typeof r.employee === "object" && r.employee ? r.employee.department : "";
    const query = search.trim().toLowerCase();
    if (query && !name.toLowerCase().includes(query) && !dept.toLowerCase().includes(query)) return false;
    if (department && dept !== department) return false;
    return true;
  };
  const matchesFilters = (r: AttendanceRecord) =>
    matchesSearchAndDept(r) && (!statusFilter || displayStatus(r, overtimeThresholdMinutes) === statusFilter);

  const filteredRange = useMemo(
    () => rangeRecords.filter(matchesFilters),
    [rangeRecords, search, department, statusFilter, overtimeThresholdMinutes]
  );
  // Status filter deliberately excluded from the comparison baseline - it narrows *this* view, not the population
  // the trend is measured against, so "vs last period" stays a like-for-like completion-rate comparison.
  const filteredPrevRange = useMemo(
    () => prevRangeRecords.filter(matchesSearchAndDept),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prevRangeRecords, search, department]
  );
  const filteredPage = useMemo(
    () => pageRecords.filter(matchesFilters),
    [pageRecords, search, department, statusFilter, overtimeThresholdMinutes]
  );

  const completionRate = (records: AttendanceRecord[]) =>
    records.length ? (records.filter((r) => r.checkIn && r.checkOut).length / records.length) * 100 : 0;

  const totalShiftRecords = filteredRange.length;
  const currentCompletionRate = completionRate(filteredRange);
  const prevCompletionRate = completionRate(filteredPrevRange);
  const loggedOvertimeMinutes = useMemo(
    () =>
      filteredRange.reduce((sum, r) => {
        const minutes = durationMinutes(r.checkIn, r.checkOut);
        return minutes && minutes > overtimeThresholdMinutes ? sum + (minutes - overtimeThresholdMinutes) : sum;
      }, 0),
    [filteredRange, overtimeThresholdMinutes]
  );
  const missingCheckouts = useMemo(
    () => filteredRange.filter((r) => displayStatus(r, overtimeThresholdMinutes) === "incomplete").length,
    [filteredRange, overtimeThresholdMinutes]
  );

  function openDrawer(record: AttendanceRecord) {
    setDrawerTarget({ id: record._id, name: employeeRefName(record.employee), date: record.date, record });
  }

  function openManualEntryFromDrawer() {
    if (!drawerTarget) return;
    setManualEntryPrefill({
      employeeId: typeof drawerTarget.record.employee === "object" ? drawerTarget.record.employee?._id : undefined,
      date: drawerTarget.date,
    });
    setDrawerTarget(null);
    setManualEntryOpen(true);
  }

  function refreshAll() {
    loadRange(from, to);
    loadPage(page, from, to);
    setDrawerTarget(null);
  }

  function buildExportRows() {
    return filteredRange.map((r) => ({
      date: r.date,
      name: employeeRefName(r.employee),
      id: typeof r.employee === "object" && r.employee ? r.employee.employeeId : "",
      checkIn: formatTime(r.checkIn),
      checkOut: formatTime(r.checkOut),
      duration: formatDuration(r.checkIn, r.checkOut),
      status: displayStatus(r, overtimeThresholdMinutes),
    }));
  }

  function exportCsv() {
    const rows = buildExportRows();
    const header = ["Date", "Employee", "ID", "Check-in", "Check-out", "Duration", "Status"];
    const lines = rows.map((r) =>
      [r.date, r.name, r.id, r.checkIn, r.checkOut, r.duration, r.status]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-report-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast({ title: "Export ready", description: `${rows.length} rows downloaded as CSV.`, severity: "success" });
  }

  function exportPdf() {
    const rows = buildExportRows();
    const win = window.open("", "_blank");
    if (!win) {
      addToast({ title: "Pop-up blocked", description: "Allow pop-ups to export a PDF.", severity: "danger" });
      return;
    }
    win.document.write(`
      <html>
        <head>
          <title>Attendance Report ${from} to ${to}</title>
          <style>
            body { font-family: -apple-system, Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            p { color: #64748b; font-size: 12px; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { text-align: left; padding: 6px 10px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
            th { text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-size: 10px; }
          </style>
        </head>
        <body>
          <h1>Attendance Report</h1>
          <p>${from} to ${to}</p>
          <table>
            <thead>
              <tr><th>Date</th><th>Employee</th><th>ID</th><th>Check-in</th><th>Check-out</th><th>Duration</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r) =>
                    `<tr><td>${r.date}</td><td>${r.name}</td><td>${r.id}</td><td>${r.checkIn}</td><td>${r.checkOut}</td><td>${r.duration}</td><td>${r.status}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    addToast({
      title: "Print dialog opened",
      description: "Choose \"Save as PDF\" as the destination to export.",
      severity: "success",
    });
  }

  const columnCount = 7;

  return (
    <div className="bg-[#F8FAFC] -m-4 p-4 sm:-m-6 sm:p-6 rounded-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Attendance Audit &amp; Historical Reports</h1>
          <p className="text-xs font-normal text-slate-500 mt-0.5">
            Generate compliance logs, inspect shift anomalies, and export payroll records.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3.5 py-2 rounded-lg"
          >
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3.5 py-2 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium px-3.5 py-2 rounded-lg shadow-sm"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Schedule Automatic Delivery
            </button>
          )}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Shift Records"
          value={fetchingRange ? "—" : totalShiftRecords}
          helperText="Current range"
          icon={ListChecks}
          tone="blue"
        />
        <MetricCard
          label="Completion Rate"
          value={fetchingRange ? "—" : `${currentCompletionRate.toFixed(1)}%`}
          trend={fetchingRange ? undefined : { value: currentCompletionRate - prevCompletionRate, label: "vs last period" }}
          icon={CheckCircle2}
          tone="emerald"
        />
        <MetricCard
          label="Logged Overtime"
          value={fetchingRange ? "—" : formatMinutes(loggedOvertimeMinutes)}
          icon={Clock3}
          tone="slate"
        />
        <MetricCard
          label="Flagged Exceptions"
          value={fetchingRange ? "—" : missingCheckouts}
          helperText={!fetchingRange && missingCheckouts > 0 ? `${missingCheckouts} Missing Check-out${missingCheckouts === 1 ? "" : "s"}` : undefined}
          icon={AlertTriangle}
          tone="red"
        />
      </div>

      {/* Charts - admin only: department/company-wide breakdowns aren't
          meaningful (and /employees 403s) for a staff member's own history */}
      {isAdmin && (
        <div className="mb-6">
          <AttendanceAnalytics />
        </div>
      )}

      {/* Table container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-end gap-3 p-4 border-b border-slate-200/80">
          {isAdmin && (
            <div className="w-72 max-w-full">
              <label className="block text-xs text-slate-500 mb-1" htmlFor="report-search">
                Search
              </label>
              <div className={dateGroupClass}>
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  id="report-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee name, ID, or location..."
                  className="flex-1 outline-none bg-transparent text-sm"
                />
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="w-44">
              <label className="block text-xs text-slate-500 mb-1" htmlFor="report-department">
                Department
              </label>
              <div className={dateGroupClass}>
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  id="report-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="flex-1 outline-none bg-transparent text-sm text-slate-700"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="w-48">
            <label className="block text-xs text-slate-500 mb-1" htmlFor="report-status">
              Status
            </label>
            <div className={dateGroupClass}>
              <select
                id="report-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DisplayStatus | "")}
                className="flex-1 outline-none bg-transparent text-sm text-slate-700"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ml-auto">
            <DateRangeField
              from={from}
              to={to}
              onApply={(newFrom, newTo) => {
                setFrom(newFrom);
                setTo(newTo);
                loadRange(newFrom, newTo);
                loadPage(1, newFrom, newTo);
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-left">
              <tr>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Check-In</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Check-Out</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Duration</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Compliance</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fetchingPage ? (
                <TableSkeletonRows columns={columnCount} />
              ) : filteredPage.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={columnCount}>
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                filteredPage.map((r) => {
                  const name = employeeRefName(r.employee);
                  const role = typeof r.employee === "object" && r.employee ? r.employee.designation : "";
                  const code = typeof r.employee === "object" && r.employee ? r.employee.employeeId : "";
                  return (
                    <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono tabular-nums text-xs text-slate-500">{r.date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={name} size="sm" />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => openDrawer(r)}
                              className="block text-sm font-medium text-slate-900 hover:text-blue-600 truncate"
                            >
                              {name}
                            </button>
                            <p className="text-[11px] text-slate-400 truncate">
                              {role || "—"} <span className="font-mono">· {code}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-xs text-slate-700">{formatTime(r.checkIn)}</td>
                      <td className={`px-4 py-3 font-mono tabular-nums text-xs ${r.checkOut ? "text-slate-700" : "text-slate-400"}`}>
                        {formatTime(r.checkOut)}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-xs font-semibold text-slate-800">
                        {formatDuration(r.checkIn, r.checkOut)}
                      </td>
                      <td className="px-4 py-3">
                        <ComplianceBadge status={displayStatus(r, overtimeThresholdMinutes)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDrawer(r)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600"
                        >
                          Inspect Logs
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={pageTotal} onPageChange={(p) => loadPage(p)} />
      </div>

      <AuditDrawer
        open={!!drawerTarget}
        onClose={() => setDrawerTarget(null)}
        employeeName={drawerTarget?.name ?? ""}
        date={drawerTarget?.date ?? ""}
        record={drawerTarget?.record ?? null}
        onResolved={refreshAll}
        onAddManualEntry={openManualEntryFromDrawer}
        canResolve={isAdmin}
      />

      {isAdmin && (
        <ManualTimeEntryModal
          isOpen={manualEntryOpen}
          onClose={() => setManualEntryOpen(false)}
          employees={employees.filter((e) => e.active)}
          onSaved={refreshAll}
          initialEmployeeId={manualEntryPrefill.employeeId}
          initialDate={manualEntryPrefill.date}
        />
      )}

      {isAdmin && (
        <ScheduleDeliveryModal isOpen={scheduleOpen} onClose={() => setScheduleOpen(false)} onSaved={() => setScheduleOpen(false)} />
      )}
    </div>
  );
}
