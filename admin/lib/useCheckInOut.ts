import { useCallback, useEffect, useState } from "react";
import { addToast } from "@heroui/react";
import api from "@/lib/axios";
import { getCurrentLocation, getCurrentLocationResult, type GeoErrorReason } from "@/lib/geolocation";
import { getErrorMessage } from "@/lib/errors";
import { todayStr } from "@/lib/dates";
import type { AttendanceRecord, Employee } from "@/types";

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
 * Loads today's employee + attendance record for the signed-in user and
 * exposes check-in/check-out actions. Shared by the My Attendance page and
 * the staff dashboard's quick-action card so both stay in sync with the
 * same location-guidance and toast behavior.
 */
export function useCheckInOut() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const date = todayStr();

  const loadData = useCallback(() => {
    setLoading(true);
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
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function checkIn() {
    if (!employee) return;
    const result = await getCurrentLocationResult();
    if (!result.coords) {
      addToast({ ...LOCATION_GUIDANCE[result.reason], severity: "warning" });
      return;
    }
    try {
      await api.post("/attendance", { employeeId: employee._id, date, ...result.coords });
      addToast({ title: "Checked in", description: "Your check-in was recorded successfully.", severity: "success" });
      loadData();
    } catch (err) {
      addToast({
        title: "Check-in failed",
        description: getErrorMessage(err, "Something went wrong. Please try again."),
        severity: "danger",
      });
    }
  }

  async function checkOut() {
    if (!record) return;
    const location = await getCurrentLocation();
    try {
      await api.put(`/attendance/${record._id}`, { action: "checkout", ...location });
      addToast({ title: "Checked out", description: "Your check-out was recorded successfully.", severity: "success" });
      loadData();
    } catch (err) {
      addToast({
        title: "Check-out failed",
        description: getErrorMessage(err, "Something went wrong. Please try again."),
        severity: "danger",
      });
    }
  }

  return { employee, record, loading, error, checkIn, checkOut, refresh: loadData };
}
