import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, addToast } from "@heroui/react";
import { TextField, Label, Input, FieldError } from "react-aria-components";
import { Search, Building2, Plus, Download, Users, UserCheck, Building, Hourglass, X } from "lucide-react";
import { TableSkeletonRows } from "@/components/Skeleton";
import Avatar from "@/components/panels/attendance/dashboard/Avatar";
import MetricCard from "@/components/panels/attendance/dashboard/MetricCard";
import RowActionsMenu from "@/components/panels/employees/RowActionsMenu";
import ProfileDrawer from "@/components/panels/employees/ProfileDrawer";
import AvatarUpload from "@/components/panels/employees/AvatarUpload";
import EmployeeStatusBadge from "@/components/panels/employees/EmployeeStatusBadge";
import { dateGroupClass } from "@/components/DateFilterField";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { useSettings } from "@/lib/SettingsContext";
import type { Employee, EmployeeCredentials, EmployeeStatus, EmploymentType } from "@/types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  workEmail: "",
  department: "",
  designation: "",
  role: "staff" as "staff" | "admin",
  dateOfBirth: "",
  hireDate: todayStr(),
  officeLocation: "",
  manager: "",
  employmentType: "full_time" as EmploymentType,
  photoUrl: null as string | null,
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 data-[invalid]:border-red-500";

const STATUS_FILTER_OPTIONS: { value: EmployeeStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "pending_onboarding", label: "Pending Onboarding" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

function FormField({
  label,
  placeholder,
  isRequired,
  type,
  value,
  onChange,
  validate,
}: {
  label: string;
  placeholder?: string;
  isRequired?: boolean;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  validate?: (value: string) => string | null;
}) {
  return (
    <TextField isRequired={isRequired} type={type} value={value} onChange={onChange} validate={validate}>
      <Label className="block text-sm font-medium text-slate-800 mb-1">
        {label}
        {isRequired && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Input placeholder={placeholder} className={inputClass} />
      <FieldError className="block text-xs text-red-600 mt-1" />
    </TextField>
  );
}

export default function EmployeesPanel() {
  const { settings } = useSettings();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [fetching, setFetching] = useState(true);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<EmployeeStatus | "">("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<EmployeeCredentials | null>(null);
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);

  function loadEmployees() {
    setFetching(true);
    api
      .get<{ employees: Employee[] }>("/employees")
      .then((res) => setEmployees(res.data.employees))
      .finally(() => setFetching(false));
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (query) {
        const haystack = `${e.name} ${e.workEmail} ${e.employeeId}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (department && e.department !== department) return false;
      if (status && e.status !== status) return false;
      return true;
    });
  }, [employees, search, department, status]);

  const activeCount = useMemo(() => employees.filter((e) => e.active).length, [employees]);
  const pendingOnboardingCount = useMemo(
    () => employees.filter((e) => e.status === "pending_onboarding").length,
    [employees]
  );

  function updateField<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setForm({ ...emptyForm, employmentType: settings.employmentTypes[0]?.key ?? emptyForm.employmentType });
    setError(null);
    setShowCreate(true);
  }

  function closeCreate() {
    setShowCreate(false);
    setError(null);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ employee: Employee; credentials: EmployeeCredentials }>("/employees", {
        ...form,
        manager: form.manager || null,
      });
      setShowCreate(false);
      setCredentials(res.data.credentials);
      addToast({
        title: "Employee added",
        description: `${res.data.employee.name} was created successfully.`,
        severity: "success",
      });
      loadEmployees();
    } catch (err) {
      const message = getErrorMessage(err, "Failed to add employee");
      setError(message);
      addToast({ title: "Failed to add employee", description: message, severity: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(employee: Employee) {
    if (!confirm(`Remove ${employee.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/employees/${employee._id}`);
      addToast({ title: "Employee deleted", description: `${employee.name} was removed.`, severity: "success" });
      loadEmployees();
    } catch (err) {
      addToast({
        title: "Failed to delete employee",
        description: getErrorMessage(err, "Something went wrong. Please try again."),
        severity: "danger",
      });
    }
  }

  function exportRoster() {
    const header = [
      "Employee ID",
      "First Name",
      "Middle Name",
      "Last Name",
      "Work Email",
      "Department",
      "Designation",
      "Role",
      "Status",
      "Hire Date",
      "Office Location",
      "Employment Type",
      "Manager",
    ];
    const lines = filteredEmployees.map((e) =>
      [
        e.employeeId,
        e.firstName,
        e.middleName,
        e.lastName,
        e.workEmail,
        e.department,
        e.designation,
        e.role,
        e.status,
        e.hireDate ? e.hireDate.slice(0, 10) : "",
        e.officeLocation,
        e.employmentType,
        e.manager?.name ?? "",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee-roster.csv";
    link.click();
    URL.revokeObjectURL(url);
    addToast({ title: "Export ready", description: `${filteredEmployees.length} employees downloaded as CSV.`, severity: "success" });
  }

  const columnCount = 5;

  return (
    <div className="bg-[#F8FAFC] -m-4 p-4 sm:-m-6 sm:p-6 rounded-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Employee Directory</h1>
          <p className="text-xs font-normal text-slate-500 mt-0.5">
            Manage staff records, department assignments, and system access roles.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={exportRoster}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3.5 py-2 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            Export Roster
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium px-3.5 py-2 rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Live metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Employees" value={fetching ? "—" : employees.length} icon={Users} tone="blue" />
        <MetricCard label="Active Staff" value={fetching ? "—" : activeCount} icon={UserCheck} tone="emerald" />
        <MetricCard label="Departments" value={fetching ? "—" : departments.length} icon={Building} tone="slate" />
        <MetricCard
          label="Pending Onboarding"
          value={fetching ? "—" : pendingOnboardingCount}
          helperText={!fetching && pendingOnboardingCount > 0 ? "Haven't set a password yet" : undefined}
          icon={Hourglass}
          tone="red"
        />
      </div>

      {credentials && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-4 mb-6 text-sm text-emerald-800 flex items-start justify-between gap-4">
          <div>
            <p className="font-medium mb-1">Employee login created</p>
            <p>
              Username: <span className="font-mono">{credentials.username}</span>
            </p>
            <p>
              Temporary password: <span className="font-mono">{credentials.temporaryPassword}</span>
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Share these with the employee so they can log in and record their own attendance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCredentials(null)}
            aria-label="Dismiss"
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-end gap-3 p-4 border-b border-slate-200/80">
          <div className="w-72 max-w-full">
            <label className="block text-xs text-slate-500 mb-1" htmlFor="employee-search">
              Search
            </label>
            <div className={dateGroupClass}>
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                id="employee-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or ID..."
                className="flex-1 outline-none bg-transparent text-sm"
              />
            </div>
          </div>

          <div className="w-48">
            <label className="block text-xs text-slate-500 mb-1" htmlFor="employee-department">
              Department
            </label>
            <div className={dateGroupClass}>
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                id="employee-department"
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

          <div className="w-48">
            <label className="block text-xs text-slate-500 mb-1" htmlFor="employee-status">
              Status
            </label>
            <div className={dateGroupClass}>
              <select
                id="employee-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EmployeeStatus | "")}
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
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-left">
              <tr>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Employee ID</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Department</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Designation &amp; Role</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fetching ? (
                <TableSkeletonRows columns={columnCount} />
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={columnCount}>
                    {employees.length === 0 ? "No employees yet. Click “Add Employee” to add your first one." : "No employees match the current filters."}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp._id}
                    onClick={() => setProfileEmployee(emp)}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono tabular-nums text-xs text-slate-500">{emp.employeeId}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={emp.name} photoUrl={emp.photoUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 hover:text-blue-600 cursor-pointer truncate">
                            {emp.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{emp.workEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {emp.department ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-0.5">
                          {emp.department}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-700">{emp.designation || "—"}</span>
                        <span
                          className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            emp.role === "admin" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {emp.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <EmployeeStatusBadge status={emp.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowActionsMenu onEdit={() => setProfileEmployee(emp)} onDelete={() => handleDelete(emp)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee modal */}
      <Modal isOpen={showCreate} onClose={closeCreate} placement="center" scrollBehavior="inside" size="2xl">
        <ModalContent>
          <ModalHeader>Add Employee</ModalHeader>
          <ModalBody>
            <form id="add-employee-form" onSubmit={handleCreate} className="grid grid-cols-1 gap-5">
              <AvatarUpload
                name={`${form.firstName} ${form.lastName}`.trim()}
                value={form.photoUrl}
                onChange={(dataUrl) => updateField("photoUrl", dataUrl)}
              />

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 pb-1 border-b border-slate-100">
                  Section 1: Personal Information
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="First name"
                    placeholder="John"
                    isRequired
                    value={form.firstName}
                    onChange={(v) => updateField("firstName", v)}
                  />
                  <FormField
                    label="Last name"
                    placeholder="Doe"
                    isRequired
                    value={form.lastName}
                    onChange={(v) => updateField("lastName", v)}
                  />
                  <FormField
                    label="Middle name"
                    placeholder="Michael"
                    value={form.middleName}
                    onChange={(v) => updateField("middleName", v)}
                  />
                  <FormField
                    label="Work email"
                    placeholder="john@example.com"
                    type="email"
                    isRequired
                    value={form.workEmail}
                    onChange={(v) => updateField("workEmail", v)}
                    validate={(value) => {
                      if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
                        return "Please enter a valid email address";
                      }
                      return null;
                    }}
                  />
                  <FormField
                    label="Date of birth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(v) => updateField("dateOfBirth", v)}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Used to populate this employee&apos;s birthday on the Celebrations widget - optional, but recommended.
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 pb-1 border-b border-slate-100">
                  Section 2: Organizational Details
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">Employee ID</label>
                    <div className={`${inputClass} bg-slate-50 text-slate-400 font-mono`}>Auto-generated on save</div>
                  </div>
                  <FormField
                    label="Hire date"
                    type="date"
                    isRequired
                    value={form.hireDate}
                    onChange={(v) => updateField("hireDate", v)}
                  />
                  {settings.departments.length > 0 ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-800 mb-1">Department</label>
                      <select
                        value={form.department}
                        onChange={(e) => updateField("department", e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select a department...</option>
                        {settings.departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <FormField
                      label="Department"
                      placeholder="Engineering"
                      value={form.department}
                      onChange={(v) => updateField("department", v)}
                    />
                  )}
                  <FormField
                    label="Job title"
                    placeholder="Software Engineer"
                    value={form.designation}
                    onChange={(v) => updateField("designation", v)}
                  />
                  {settings.officeLocations.length > 0 ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-800 mb-1">
                        Office location<span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <select
                        value={form.officeLocation}
                        onChange={(e) => updateField("officeLocation", e.target.value)}
                        className={inputClass}
                      >
                        <option value="" disabled>
                          Select a location...
                        </option>
                        {settings.officeLocations.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <FormField
                        label="Office location"
                        placeholder="Nairobi HQ"
                        isRequired
                        value={form.officeLocation}
                        onChange={(v) => updateField("officeLocation", v)}
                      />
                      <p className="text-[11px] text-amber-600 mt-1">
                        No locations configured yet - add them in Settings for a dropdown here.
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Direct manager<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                      value={form.manager}
                      onChange={(e) => updateField("manager", e.target.value)}
                      className={inputClass}
                    >
                      <option value="">No manager (top of hierarchy)</option>
                      {employees.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} · {m.employeeId}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 pb-1 border-b border-slate-100">
                  Section 3: Access &amp; Account Security
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">System role</label>
                    <select
                      value={form.role}
                      onChange={(e) => updateField("role", e.target.value as "staff" | "admin")}
                      className={inputClass}
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">Employment type</label>
                    <select
                      value={form.employmentType}
                      onChange={(e) => updateField("employmentType", e.target.value as EmploymentType)}
                      className={inputClass}
                    >
                      {settings.employmentTypes.map((et) => (
                        <option key={et.key} value={et.key}>
                          {et.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  New accounts start as <span className="font-medium text-slate-500">Pending Onboarding</span> until the
                  employee sets their own password.
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={closeCreate}>
              Cancel
            </Button>
            <Button color="primary" type="submit" form="add-employee-form" isLoading={submitting}>
              Create Employee
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ProfileDrawer
        employee={profileEmployee}
        employees={employees}
        onClose={() => setProfileEmployee(null)}
        onSaved={() => {
          setProfileEmployee(null);
          loadEmployees();
        }}
      />
    </div>
  );
}
