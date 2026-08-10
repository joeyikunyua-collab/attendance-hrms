import { useEffect, useMemo, useState } from "react";
import { addToast } from "@heroui/react";
import { X, Mail, MapPin, CalendarDays, Briefcase, Save } from "lucide-react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { useSettings } from "@/lib/SettingsContext";
import Avatar from "@/components/panels/attendance/dashboard/Avatar";
import ComboSelect from "./ComboSelect";
import EmployeeStatusBadge from "./EmployeeStatusBadge";
import type { Employee, EmployeeStatus } from "@/types";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

const STATUS_OPTIONS: EmployeeStatus[] = ["pending_onboarding", "active", "inactive", "suspended"];
const STATUS_LABELS: Record<EmployeeStatus, string> = {
  pending_onboarding: "Pending Onboarding",
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** Enterprise-standard side-panel for reviewing/editing one employee's
 * profile - opens on row click, replaces the old plain "Edit" modal. */
export default function ProfileDrawer({
  employee,
  employees,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { settings } = useSettings();
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [status, setStatus] = useState<EmployeeStatus>("active");
  const [managerId, setManagerId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!employee) return;
    setDepartment(employee.department);
    setDesignation(employee.designation);
    setRole(employee.role);
    setStatus(employee.status);
    setManagerId(employee.manager?._id ?? "");
  }, [employee]);

  const departmentOptions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(),
    [employees]
  );
  const designationOptions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.designation).filter(Boolean))).sort(),
    [employees]
  );
  const managerCandidates = useMemo(
    () => employees.filter((e) => e._id !== employee?._id).sort((a, b) => a.name.localeCompare(b.name)),
    [employees, employee]
  );

  async function handleSave() {
    if (!employee) return;
    setSubmitting(true);
    try {
      await api.put(`/employees/${employee._id}`, {
        department,
        designation,
        role,
        status,
        manager: managerId || null,
      });
      addToast({ title: "Profile updated", description: `${employee.name}'s profile was saved.`, severity: "success" });
      onSaved();
    } catch (err) {
      addToast({
        title: "Failed to update profile",
        description: getErrorMessage(err, "Something went wrong. Please try again."),
        severity: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/20 z-40 transition-opacity ${
          employee ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-transform duration-200 ${
          employee ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Employee profile"
      >
        {employee && (
          <>
            <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-200/80">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={employee.name} photoUrl={employee.photoUrl} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{employee.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{employee.employeeId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Current status</p>
                <EmployeeStatusBadge status={employee.status} />
              </div>

              <div className="rounded-xl border border-slate-200/80 p-3 space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{employee.workEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span>Hired {formatDate(employee.hireDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{employee.officeLocation || "No office location on file"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 shrink-0" />
                  <span className="capitalize">{employee.employmentType.replace("_", " ")}</span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Edit profile</p>

                {settings.departments.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">Department</label>
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass}>
                      <option value="">Select a department...</option>
                      {settings.departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <ComboSelect label="Department" value={department} options={departmentOptions} onChange={setDepartment} placeholder="e.g. Engineering" />
                )}
                <ComboSelect label="Job title" value={designation} options={designationOptions} onChange={setDesignation} placeholder="e.g. Software Engineer" />

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">System role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as "staff" | "admin")} className={inputClass}>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Direct manager</label>
                  <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={inputClass}>
                    <option value="">No manager (top of hierarchy)</option>
                    {managerCandidates.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} · {m.employeeId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Account status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as EmployeeStatus)} className={inputClass}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  {(status === "inactive" || status === "suspended") && (
                    <p className="text-xs text-amber-600 mt-1">Any active session for this account will be signed out immediately.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200/80">
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {submitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
