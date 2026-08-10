import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";
import api from "@/lib/axios";
import type { SystemSettings } from "@/types";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FALLBACK_SETTINGS: SystemSettings = {
  companyName: "Attendance System",
  companyLogoUrl: null,
  overtimeThresholdMinutes: 480,
  weekendDays: [0, 6],
  checkInReminderStart: "09:00",
  checkInReminderEnd: "12:00",
  minPasswordLength: 8,
  officeLocations: [],
  departments: [],
  employmentTypes: [],
  announcementCategories: [],
  leaveTypes: [],
  leaveApprovalFlow: "admin_only",
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
};

interface SettingsContextValue {
  settings: SystemSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: FALLBACK_SETTINGS,
  loading: true,
  refresh: async () => {},
});

/**
 * Loads system settings once at app root and keeps them available to every
 * page/component. Only ever hit for authenticated sessions (GET /settings
 * requires a session) - the login page fetches its own branding separately
 * via the unauthenticated GET /settings/public.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(FALLBACK_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // A single failed attempt used to strand the whole session on
    // FALLBACK_SETTINGS (e.g. empty leaveTypes) with no way to recover
    // short of a full page reload - retry transient failures a couple of
    // times before giving up. A 401 means "not logged in yet" (e.g. still
    // on /login) rather than a transient error, so that's not worth
    // retrying - this component remounts fresh once that changes anyway.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await api.get<{ settings: SystemSettings }>("/settings");
        setSettings(res.data.settings);
        break;
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 401 || attempt === maxAttempts) break;
        await sleep(attempt * 1000);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
