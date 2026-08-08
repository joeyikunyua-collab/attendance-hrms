import { useEffect } from "react";
import api from "@/lib/axios";
import type { AuthUser } from "@/types";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Background poller that nudges the server to create a "check in" bell
 * notification if it's a workday, before noon, and the staff member hasn't
 * checked in yet. The server dedupes per half-hour slot, so calling this
 * more often than every 30 min (to reliably catch each boundary) is safe.
 */
export function useCheckInReminder(user: AuthUser | null) {
  useEffect(() => {
    if (!user || user.role !== "staff") return;

    function check() {
      api.post("/attendance/checkin-reminder").catch(() => {});
    }

    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user]);
}
