import { useEffect, useMemo, useState } from "react";
import { addToast } from "@heroui/react";
import LocationModal, { EyeIcon } from "@/components/LocationModal";
import { Skeleton, TableSkeletonRows } from "@/components/Skeleton";
import AdminCalendarView from "@/components/panels/attendance/AdminCalendarView";
import StaffCalendarView from "@/components/panels/attendance/StaffCalendarView";
import api from "@/lib/axios";
import { getCurrentLocation, getCurrentLocationResult, type GeoCoords, type GeoErrorReason } from "@/lib/geolocation";
import { getErrorMessage } from "@/lib/errors";
import { employeeRefId, employeeRefName } from "@/lib/employeeRef";
import type { AttendanceRecord, AuthUser, Employee } from "@/types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const LOCATION_GUIDANCE: Record<GeoErrorReason, { title: string; description: string }> = {
  "permission-denied": {
    title: "Location access blocked",
    description:
      "You previously blocked location for this site, so your browser won't ask again automatically. " +
      "Click the lock/info icon next to the address bar, set Location to \"Allow\", then reload the page and try again.",
  },
  timeout: {
    title: "Location took too long",
    description:
      "Couldn't get a location fix in time. Make sure location/GPS is turned on for your device and try again.",
  },
  unavailable: {
    title: "Location unavailable",
    description:
      "Your device couldn't determine its location right now. Check your location/GPS settings and try again.",
  },
  unsupported: {
    title: "Location not supported",
    description: "This browser doesn't support location services, so you can't clock in from here.",
  },
};

/**
 * Clock-in requires a location fix so attendance can be tied to a place.
 * Returns null (and shows a toast explaining why, with guidance specific to
 * the failure reason) if a location couldn't be obtained.
 */
async function requireLocationForCheckIn(): Promise<GeoCoords | null> {
  const result = await getCurrentLocationResult();
  if (!result.coords) {
    addToast({ ...LOCATION_GUIDANCE[result.reason], severity: "warning" });
    return null;
  }
  return result.coords;
}

function MyAttendanceView() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const date = todayStr();

  function loadData() {
    setFetching(true);
    setError(null);
    Promise.all([
      api.get<{ employee: Employee }>("/employees/me"),
      api.get<{ records: AttendanceRecord[] }>("/attendance", { params: { date } }),
    ])
      .then(([empRes, attRes]) => {
        setEmployee(empRes.data.employee);
        setRecord(attRes.data.records[0] ?? null);
      })
      .catch(() => setError("No employee record is linked to this account."))
      .finally(() => setFetching(false));
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCheckIn() {
    if (!employee) return;
    const location = await requireLocationForCheckIn();
    if (!location) return;
    try {
      await api.post("/attendance", { employeeId: employee._id, date, ...location });
      addToast({
        title: "Checked in",
        description: "Your check-in was recorded successfully.",
        severity: "success",
      });
      loadData();
    } catch (err) {
      addToast({
        title: "Check-in failed",
        description: getErrorMessage(err, "Something went wrong. Please try again."),
        severity: "danger",
      });
    }
  }

  async function handleCheckOut() {
    if (!record) return;
    const location = await getCurrentLocation();
    try {
      await api.put(`/attendance/${record._id}`, { action: "checkout", ...location });
      addToast({
        title: "Checked out",
        description: "Your check-out was recorded successfully.",
        severity: "success",
      });
      loadData();
    } catch (err) {
      addToast({
        title: "Check-out failed",
        description: getErrorMessage(err, "Something went wrong. Please try again."),
        severity: "danger",
      });
    }
  }

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
          onClick={handleCheckIn}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md px-3 py-2"
        >
          Check in
        </button>
      ) : !record.checkOut ? (
        <button
          onClick={handleCheckOut}
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

function AllEmployeesView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [locationRecord, setLocationRecord] = useState<AttendanceRecord | null>(null);
  const date = todayStr();

  function loadData() {
    setFetching(true);
    Promise.all([
      api.get<{ employees: Employee[] }>("/employees"),
      api.get<{ records: AttendanceRecord[] }>("/attendance", { params: { date } }),
    ])
      .then(([empRes, attRes]) => {
        setEmployees(empRes.data.employees.filter((e) => e.active));
        setRecords(attRes.data.records);
      })
      .finally(() => setFetching(false));
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordByEmployee = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of records) {
      const empId = employeeRefId(r.employee);
      if (!empId) continue;
      map.set(empId, r);
    }
    return map;
  }, [records]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-left border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">ID</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Name</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Check-in</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Check-out</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {fetching ? (
            <TableSkeletonRows columns={6} />
          ) : employees.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                No active employees. Add some on the Employees page first.
              </td>
            </tr>
          ) : (
            employees.map((emp) => {
              const record = recordByEmployee.get(emp._id);
              const hasLocation =
                record &&
                ((record.checkInLatitude !== null && record.checkInLongitude !== null) ||
                  (record.checkOutLatitude !== null && record.checkOutLongitude !== null));
              return (
                <tr key={emp._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{emp.employeeId}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{emp.name}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(record?.checkIn ?? null)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(record?.checkOut ?? null)}</td>
                  <td className="px-4 py-3">
                    {!record ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                        Not checked in
                      </span>
                    ) : !record.checkOut ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Checked in
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                        Done for today
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {hasLocation && (
                      <button
                        onClick={() => setLocationRecord(record ?? null)}
                        title="View location"
                        aria-label="View location"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {locationRecord && (
        <LocationModal
          isOpen
          onClose={() => setLocationRecord(null)}
          title={
            typeof locationRecord.employee === "string" ? "Location" : employeeRefName(locationRecord.employee)
          }
          entries={[
            {
              label: "Check-in",
              time: formatTime(locationRecord.checkIn),
              latitude: locationRecord.checkInLatitude,
              longitude: locationRecord.checkInLongitude,
            },
            {
              label: "Check-out",
              time: formatTime(locationRecord.checkOut),
              latitude: locationRecord.checkOutLatitude,
              longitude: locationRecord.checkOutLongitude,
            },
          ]}
        />
      )}
    </div>
  );
}

export default function AttendancePanel({ user }: { user: AuthUser }) {
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">
          {user.role === "admin" ? "Today's Attendance" : "My Attendance"}
        </h1>
        <div className="flex items-center gap-3">
          {view === "list" && user.role === "admin" && (
            <span className="text-sm text-slate-500">{new Date().toDateString()}</span>
          )}
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                view === "calendar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {view === "list" ? (
        user.role === "admin" ? (
          <AllEmployeesView />
        ) : (
          <MyAttendanceView />
        )
      ) : user.role === "admin" ? (
        <AdminCalendarView />
      ) : (
        <StaffCalendarView />
      )}
    </div>
  );
}
