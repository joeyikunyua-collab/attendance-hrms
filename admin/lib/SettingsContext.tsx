import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import api from "@/lib/axios";
import type { SystemSettings } from "@/types";

const FALLBACK_SETTINGS: SystemSettings = {
  companyName: "Attendance System",
  companyLogoUrl: null,
  overtimeThresholdMinutes: 480,
  weekendDays: [0, 6],
  checkInReminderStart: "09:00",
  checkInReminderEnd: "12:00",
  minPasswordLength: 8,
  officeLocations: [],
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
    try {
      const res = await api.get<{ settings: SystemSettings }>("/settings");
      setSettings(res.data.settings);
    } catch {
      // Not logged in yet, or request failed - keep the fallback defaults.
    } finally {
      setLoading(false);
    }
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
