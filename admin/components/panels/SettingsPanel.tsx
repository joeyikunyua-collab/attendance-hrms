import { useState, useEffect, type FormEvent } from "react";
import { addToast } from "@heroui/react";
import { Camera, X, Info, Save, ShieldAlert, Plus, MapPin, Tag, CalendarRange, GitBranch } from "lucide-react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { resizeImageToDataUrl } from "@/lib/imageResize";
import { useSettings } from "@/lib/SettingsContext";
import type { AnnouncementCategoryConfig, LeaveApprovalFlow, LeaveTypeConfig, SystemSettings } from "@/types";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const APPROVAL_FLOW_OPTIONS: { value: LeaveApprovalFlow; label: string; description: string }[] = [
  { value: "admin_only", label: "Admin only", description: "Any admin can approve or reject requests directly." },
  {
    value: "manager_only",
    label: "Manager only",
    description: "The employee's direct manager decides. Falls back to admin if nobody's assigned as their manager.",
  },
  {
    value: "manager_then_admin",
    label: "Manager, then admin",
    description:
      "The manager approves first, then an admin gives final sign-off. Falls back to admin-only if there's no manager.",
  },
];

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-sm font-semibold text-slate-800">{title}</p>
      </div>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

/** Add/remove chip list editor - used for office locations, where each
 * entry is just a plain string with no other properties to configure. */
function TagListEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-slate-300/60 text-slate-500"
              aria-label={`Remove ${v}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {values.length === 0 && <p className="text-xs text-slate-400">None configured yet.</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg px-3"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}

export default function SettingsPanel() {
  const { settings, refresh } = useSettings();
  const [form, setForm] = useState<SystemSettings>(settings);
  const [logoProcessing, setLogoProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function toggleWeekendDay(day: number) {
    setForm((f) => ({
      ...f,
      weekendDays: f.weekendDays.includes(day)
        ? f.weekendDays.filter((d) => d !== day)
        : [...f.weekendDays, day].sort(),
    }));
  }

  async function handleLogoFile(file: File) {
    if (!file.type.startsWith("image/")) {
      addToast({ title: "Not an image", description: "Choose a JPG, PNG, or similar image file.", severity: "danger" });
      return;
    }
    setLogoProcessing(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setForm((f) => ({ ...f, companyLogoUrl: dataUrl }));
    } catch (err) {
      addToast({
        title: "Couldn't process image",
        description: err instanceof Error ? err.message : "Please try a different file.",
        severity: "danger",
      });
    } finally {
      setLogoProcessing(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (form.weekendDays.length >= 7) {
      addToast({ title: "Invalid weekend days", description: "At least one day must remain a working day.", severity: "danger" });
      return;
    }
    if (form.checkInReminderStart >= form.checkInReminderEnd) {
      addToast({
        title: "Invalid reminder window",
        description: "Check-in reminder start must be before the end.",
        severity: "danger",
      });
      return;
    }
    if (form.announcementCategories.some((c) => !c.label.trim())) {
      addToast({ title: "Invalid categories", description: "Every category needs a name.", severity: "danger" });
      return;
    }
    if (form.leaveTypes.length === 0 || form.leaveTypes.some((t) => !t.label.trim())) {
      addToast({
        title: "Invalid leave types",
        description: "Keep at least one leave type, and give each a name.",
        severity: "danger",
      });
      return;
    }

    setSaving(true);
    try {
      await api.put("/settings", {
        companyName: form.companyName,
        companyLogoUrl: form.companyLogoUrl,
        overtimeThresholdMinutes: form.overtimeThresholdMinutes,
        weekendDays: form.weekendDays,
        checkInReminderStart: form.checkInReminderStart,
        checkInReminderEnd: form.checkInReminderEnd,
        defaultEmployeePassword: form.defaultEmployeePassword,
        minPasswordLength: form.minPasswordLength,
        officeLocations: form.officeLocations,
        announcementCategories: form.announcementCategories,
        leaveTypes: form.leaveTypes,
        leaveApprovalFlow: form.leaveApprovalFlow,
      });
      await refresh();
      addToast({ title: "Settings saved", description: "The changes now apply system-wide.", severity: "success" });
    } catch (err) {
      addToast({ title: "Couldn't save settings", description: getErrorMessage(err, "Something went wrong. Please try again."), severity: "danger" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      <SectionCard title="Branding" subtitle="Shown in the header and on the sign-in page.">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16 shrink-0">
            {form.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.companyLogoUrl} alt={form.companyName} className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white border-2 border-white shadow-sm hover:bg-blue-700 cursor-pointer">
              <Camera className="w-3 h-3" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={logoProcessing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Company logo</p>
            <p className="text-xs text-slate-400 mb-1">Square image works best.</p>
            {form.companyLogoUrl && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, companyLogoUrl: null }))}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600"
              >
                <X className="w-3 h-3" />
                Remove logo
              </button>
            )}
            {logoProcessing && <p className="text-xs text-slate-400">Processing…</p>}
          </div>
        </div>
        <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="settings-company-name">
          Company name
        </label>
        <input
          id="settings-company-name"
          type="text"
          value={form.companyName}
          onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
          className={inputClass}
          required
        />
      </SectionCard>

      <SectionCard title="Attendance rules" subtitle="Overtime threshold and the days treated as non-working.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="settings-overtime">
              Overtime threshold (hours)
            </label>
            <input
              id="settings-overtime"
              type="number"
              min={0.5}
              step={0.5}
              value={form.overtimeThresholdMinutes / 60}
              onChange={(e) =>
                setForm((f) => ({ ...f, overtimeThresholdMinutes: Math.round(Number(e.target.value) * 60) }))
              }
              className={inputClass}
              required
            />
            <p className="text-xs text-slate-400 mt-1">Shifts longer than this are flagged "Overtime".</p>
          </div>
        </div>
        <label className="block text-sm font-medium text-slate-800 mb-2">Weekend days</label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_OPTIONS.map((opt) => {
            const active = form.weekendDays.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleWeekendDay(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  active
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Check-in reminders" subtitle="Staff who haven't checked in get a bell notification in this window.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="settings-reminder-start">
              Start time
            </label>
            <input
              id="settings-reminder-start"
              type="time"
              value={form.checkInReminderStart}
              onChange={(e) => setForm((f) => ({ ...f, checkInReminderStart: e.target.value }))}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="settings-reminder-end">
              End time
            </label>
            <input
              id="settings-reminder-end"
              type="time"
              value={form.checkInReminderEnd}
              onChange={(e) => setForm((f) => ({ ...f, checkInReminderEnd: e.target.value }))}
              className={inputClass}
              required
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Onboarding & security" subtitle="Defaults applied when a new employee account is created.">
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200/60 px-3 py-2 mb-4 text-xs text-amber-800">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p>
            The default password is shared by every new employee login until they set their own. Only admins can view
            or change it here.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="settings-default-password">
              Default employee password
            </label>
            <input
              id="settings-default-password"
              type="text"
              value={form.defaultEmployeePassword ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, defaultEmployeePassword: e.target.value }))}
              className={inputClass}
              minLength={4}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="settings-min-password">
              Minimum password length
            </label>
            <input
              id="settings-min-password"
              type="number"
              min={4}
              max={128}
              value={form.minPasswordLength}
              onChange={(e) => setForm((f) => ({ ...f, minPasswordLength: Number(e.target.value) }))}
              className={inputClass}
              required
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<MapPin className="w-4 h-4 text-slate-400" />}
        title="Office locations"
        subtitle="Offered as a dropdown when onboarding a new employee."
      >
        <TagListEditor
          values={form.officeLocations}
          onChange={(officeLocations) => setForm((f) => ({ ...f, officeLocations }))}
          placeholder="e.g. Nairobi HQ"
        />
      </SectionCard>

      <SectionCard
        icon={<Tag className="w-4 h-4 text-slate-400" />}
        title="Announcement categories"
        subtitle="Shown as a category picker when posting a company announcement."
      >
        <div className="space-y-2">
          {form.announcementCategories.map((cat, i) => (
            <div key={cat.key || i} className="flex items-center gap-2">
              <input
                value={cat.label}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    announcementCategories: f.announcementCategories.map((c, ci) =>
                      ci === i ? { ...c, label: e.target.value } : c
                    ),
                  }))
                }
                placeholder="Category name"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    announcementCategories: f.announcementCategories.filter((_, ci) => ci !== i),
                  }))
                }
                className="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                aria-label="Remove category"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setForm((f) => ({
              ...f,
              announcementCategories: [...f.announcementCategories, { key: "", label: "" } as AnnouncementCategoryConfig],
            }))
          }
          className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg px-3 py-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add category
        </button>
      </SectionCard>

      <SectionCard
        icon={<CalendarRange className="w-4 h-4 text-slate-400" />}
        title="Leave types & annual balances"
        subtitle="The number of leaves each type allows per employee, per calendar year."
      >
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-[1fr_110px_80px_32px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Type name</span>
            <span>Days / year</span>
            <span>Paid</span>
            <span />
          </div>
          {form.leaveTypes.map((lt, i) => (
            <div key={lt.key || i} className="grid grid-cols-[1fr_110px_80px_32px] gap-2 items-center">
              <input
                value={lt.label}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    leaveTypes: f.leaveTypes.map((t, ti) => (ti === i ? { ...t, label: e.target.value } : t)),
                  }))
                }
                placeholder="Leave type name"
                className={inputClass}
              />
              <input
                type="number"
                min={0}
                value={lt.annualQuota ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    leaveTypes: f.leaveTypes.map((t, ti) =>
                      ti === i ? { ...t, annualQuota: e.target.value === "" ? null : Number(e.target.value) } : t
                    ),
                  }))
                }
                placeholder="Unlimited"
                className={inputClass}
              />
              <label className="inline-flex items-center justify-center gap-1.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={lt.paid}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      leaveTypes: f.leaveTypes.map((t, ti) => (ti === i ? { ...t, paid: e.target.checked } : t)),
                    }))
                  }
                  className="rounded border-slate-300"
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, leaveTypes: f.leaveTypes.filter((_, ti) => ti !== i) }))
                }
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                aria-label="Remove leave type"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Leave "Days / year" blank for an unlimited type (e.g. unpaid leave).</p>
        <button
          type="button"
          onClick={() =>
            setForm((f) => ({
              ...f,
              leaveTypes: [...f.leaveTypes, { key: "", label: "", annualQuota: null, paid: true } as LeaveTypeConfig],
            }))
          }
          className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg px-3 py-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add leave type
        </button>
      </SectionCard>

      <SectionCard
        icon={<GitBranch className="w-4 h-4 text-slate-400" />}
        title="Leave approval flow"
        subtitle="Who has to sign off on a time-off request before it's final."
      >
        <div className="space-y-2">
          {APPROVAL_FLOW_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                form.leaveApprovalFlow === opt.value ? "border-blue-500 bg-blue-50/60" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="leaveApprovalFlow"
                checked={form.leaveApprovalFlow === opt.value}
                onChange={() => setForm((f) => ({ ...f, leaveApprovalFlow: opt.value }))}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </SectionCard>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Changes take effect immediately for every user.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-md px-4 py-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
