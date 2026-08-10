import { settingsRepository } from "../repositories/settings.repository";
import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../types";
import type { SettingsDocument } from "../models/Settings";

function slugify(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

/** Existing entries keep their `key` (it's what's stored on Announcement /
 * LeaveRequest documents, so changing it would orphan history) - new entries
 * get one derived from their label, de-duplicated against the rest of the
 * list. Runs on every update rather than being generated client-side so the
 * key format stays consistent no matter what called the API. */
function withStableKeys<T extends { key?: string; label: string }>(items: T[]): (T & { key: string })[] {
  const used = new Set<string>();
  return items.map((item) => {
    const base = item.key && item.key.trim() ? item.key.trim() : slugify(item.label);
    let candidate = base;
    let n = 2;
    while (used.has(candidate)) candidate = `${base}_${n++}`;
    used.add(candidate);
    return { ...item, key: candidate };
  });
}

/** Everyone authenticated can read most settings (they drive shared UI
 * logic like overtime/weekend rules), but `defaultEmployeePassword` is only
 * safe to show admins - it's the live shared temp password for anyone still
 * mid-onboarding, so leaking it to non-admins (or the public) would be a
 * real credential-guessing shortcut. */
async function get(user: AuthUser) {
  const settings = await settingsRepository.getLean();
  if (user.role !== "admin") {
    const { defaultEmployeePassword: _omit, ...safe } = settings;
    return safe;
  }
  return settings;
}

async function getPublic() {
  const settings = await settingsRepository.getLean();
  return { companyName: settings.companyName, companyLogoUrl: settings.companyLogoUrl };
}

async function update(admin: AuthUser, body: Partial<SettingsDocument>) {
  if (
    body.checkInReminderStart &&
    body.checkInReminderEnd &&
    body.checkInReminderStart > body.checkInReminderEnd
  ) {
    throw new ApiError(400, "Check-in reminder start must be before the end");
  }
  if (body.weekendDays && body.weekendDays.length >= 7) {
    throw new ApiError(400, "At least one day must remain a working day");
  }

  const normalized: Partial<SettingsDocument> = { ...body };
  if (body.announcementCategories) {
    normalized.announcementCategories = withStableKeys(body.announcementCategories);
  }
  if (body.leaveTypes) {
    normalized.leaveTypes = withStableKeys(body.leaveTypes);
  }
  if (body.employmentTypes) {
    normalized.employmentTypes = withStableKeys(body.employmentTypes);
  }
  if (body.officeLocations) {
    normalized.officeLocations = Array.from(new Set(body.officeLocations.map((l) => l.trim()).filter(Boolean)));
  }
  if (body.departments) {
    normalized.departments = Array.from(new Set(body.departments.map((d) => d.trim()).filter(Boolean)));
  }

  const updated = await settingsRepository.update({ ...normalized, updatedBy: admin.id as never });
  return updated.toObject() as SettingsDocument;
}

export const settingsService = {
  get,
  getPublic,
  update,
};
