import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import api from "@/lib/axios";
import { employeeRefId } from "@/lib/employeeRef";
import { addDays, generateDateRange, getWeekDates, isWeekend, toDateStr } from "@/lib/dates";
import { durationMinutes, OVERTIME_THRESHOLD_MINUTES } from "./statusUtils";
import type { AttendanceRecord, Employee } from "@/types";

type RangeKey = "thisWeek" | "lastWeek" | "thisMonth";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "thisWeek", label: "This Week" },
  { key: "lastWeek", label: "Last Week" },
  { key: "thisMonth", label: "This Month" },
];

function rangeFor(key: RangeKey): { from: string; to: string } {
  if (key === "thisWeek") {
    const week = getWeekDates();
    return { from: week[0], to: week[6] };
  }
  if (key === "lastWeek") {
    const week = getWeekDates();
    return { from: addDays(week[0], -7), to: addDays(week[6], -7) };
  }
  const now = new Date();
  const monthStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return { from: monthStart, to: monthEnd };
}

const STATUS_COLORS = { present: "#10b981", late: "#f59e0b", absent: "#f43f5e" };
const HOURS_COLORS = { worked: "#3b82f6", overtime: "#6366f1" };
const DEPARTMENT_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#f43f5e", "#06b6d4", "#8b5cf6", "#ec4899"];

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function TooltipShell({ children }: { children: React.ReactNode }) {
  return <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-lg">{children}</div>;
}

const axisTick = { fontSize: 11, fontFamily: "monospace", fill: "#94a3b8" };

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <TooltipShell>
      <p className="font-mono mb-1 text-slate-300">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-mono font-semibold">{p.value}</span>
        </p>
      ))}
    </TooltipShell>
  );
}

function HoursTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <TooltipShell>
      <p className="font-mono mb-1 text-slate-300">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-mono font-semibold">{p.value.toFixed(1)}h</span>
        </p>
      ))}
    </TooltipShell>
  );
}

function DepartmentTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipShell>
      <p className="font-semibold mb-1">{d.name}</p>
      <p>
        Compliance: <span className="font-mono font-semibold">{d.complianceRate.toFixed(0)}%</span>
      </p>
      <p className="text-slate-300">{d.value} shift{d.value === 1 ? "" : "s"} logged</p>
    </TooltipShell>
  );
}

/** Self-contained analytics section - fetches its own data for whichever
 * range is selected, so it can be dropped into the Dashboard and the
 * Reports module without either page needing to share fetch/filter state
 * with it. */
export default function AttendanceAnalytics() {
  const [rangeKey, setRangeKey] = useState<RangeKey>("thisWeek");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const { from, to } = rangeFor(rangeKey);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<{ employees: Employee[] }>("/employees"),
      api.get<{ records: AttendanceRecord[] }>("/attendance", { params: { from, to } }),
    ])
      .then(([empRes, attRes]) => {
        setEmployees(empRes.data.employees);
        setRecords(attRes.data.records);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    for (const r of records) {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r);
    }
    return map;
  }, [records]);

  const weekdaysInRange = useMemo(
    () => generateDateRange(from, to).filter((d) => !isWeekend(d)),
    [from, to]
  );

  const trendData = useMemo(
    () =>
      weekdaysInRange.map((date) => {
        const dayRecords = recordsByDate.get(date) ?? [];
        const late = dayRecords.filter((r) => r.status === "late").length;
        const present = dayRecords.filter((r) => r.checkIn && r.status !== "late" && r.status !== "absent").length;
        const absent = Math.max(activeEmployees.length - present - late, 0);
        return {
          label: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" }),
          Present: present,
          Late: late,
          Absent: absent,
        };
      }),
    [weekdaysInRange, recordsByDate, activeEmployees.length]
  );

  const hoursData = useMemo(
    () =>
      weekdaysInRange.map((date) => {
        const dayRecords = recordsByDate.get(date) ?? [];
        let workedMinutes = 0;
        let overtimeMinutes = 0;
        for (const r of dayRecords) {
          const minutes = durationMinutes(r.checkIn, r.checkOut);
          if (minutes === null) continue;
          if (minutes > OVERTIME_THRESHOLD_MINUTES) {
            workedMinutes += OVERTIME_THRESHOLD_MINUTES;
            overtimeMinutes += minutes - OVERTIME_THRESHOLD_MINUTES;
          } else {
            workedMinutes += minutes;
          }
        }
        return {
          label: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" }),
          Worked: workedMinutes / 60,
          Overtime: overtimeMinutes / 60,
        };
      }),
    [weekdaysInRange, recordsByDate]
  );

  const departmentData = useMemo(() => {
    const byDept = new Map<string, AttendanceRecord[]>();
    for (const r of records) {
      const dept = typeof r.employee === "object" && r.employee ? r.employee.department || "Unassigned" : null;
      const id = employeeRefId(r.employee);
      if (!dept || !id) continue;
      if (!byDept.has(dept)) byDept.set(dept, []);
      byDept.get(dept)!.push(r);
    }
    return Array.from(byDept.entries())
      .map(([name, deptRecords]) => ({
        name,
        value: deptRecords.length,
        complianceRate: (deptRecords.filter((r) => r.checkIn && r.checkOut).length / deptRecords.length) * 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Attendance Analytics</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRangeKey(opt.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                rangeKey === opt.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Weekly Attendance Trends" subtitle="Present, late, and absent employees per day">
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ left: -20, right: 8 }}>
                <defs>
                  <linearGradient id="fillPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={STATUS_COLORS.present} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={STATUS_COLORS.present} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={STATUS_COLORS.late} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={STATUS_COLORS.late} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={STATUS_COLORS.absent} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={STATUS_COLORS.absent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<TrendTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }} />
                <Area type="monotone" dataKey="Present" stroke={STATUS_COLORS.present} fill="url(#fillPresent)" strokeWidth={2} />
                <Area type="monotone" dataKey="Late" stroke={STATUS_COLORS.late} fill="url(#fillLate)" strokeWidth={2} />
                <Area type="monotone" dataKey="Absent" stroke={STATUS_COLORS.absent} fill="url(#fillAbsent)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Daily Worked Hours vs Overtime" subtitle="Total hours logged per weekday, standard vs overtime">
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hoursData} margin={{ left: -20, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} unit="h" />
                <Tooltip content={<HoursTooltip />} cursor={{ fill: "#f1f5f9" }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }} />
                <Bar dataKey="Worked" stackId="hours" fill={HOURS_COLORS.worked} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Overtime" stackId="hours" fill={HOURS_COLORS.overtime} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Departmental Attendance Compliance" subtitle="Share of logged shifts and completion rate by department">
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
          ) : departmentData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">No records in this range</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Tooltip content={<DepartmentTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}
                  formatter={(value) => <span className="text-slate-500">{value}</span>}
                />
                <Pie data={departmentData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {departmentData.map((entry, i) => (
                    <Cell key={entry.name} fill={DEPARTMENT_PALETTE[i % DEPARTMENT_PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
