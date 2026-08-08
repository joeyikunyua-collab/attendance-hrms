import { useEffect, useState, FormEvent } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, addToast } from "@heroui/react";
import { TextField, Label, Input, FieldError } from "react-aria-components";
import { TableSkeletonRows } from "@/components/Skeleton";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import type { Employee, EmployeeCredentials } from "@/types";

const emptyForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  workEmail: "",
  department: "",
  designation: "",
  role: "staff" as "staff" | "admin",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 data-[invalid]:border-red-500";

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [fetching, setFetching] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<EmployeeCredentials | null>(null);

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

  function updateField<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setForm(emptyForm);
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
      const res = await api.post<{ employee: Employee; credentials: EmployeeCredentials }>(
        "/employees",
        form
      );
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

  async function handleToggleActive(employee: Employee) {
    await api.put(`/employees/${employee._id}`, { active: !employee.active });
    loadEmployees();
  }

  async function handleDelete(employee: Employee) {
    if (!confirm(`Remove ${employee.name}? This cannot be undone.`)) return;
    await api.delete(`/employees/${employee._id}`);
    loadEmployees();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Employees</h1>
        <button
          onClick={openCreate}
          title="Add employee"
          aria-label="Add employee"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xl leading-none"
        >
          +
        </button>
      </div>

      {credentials && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-sm text-green-800 flex items-start justify-between gap-4">
          <div>
            <p className="font-medium mb-1">Employee login created</p>
            <p>
              Username: <span className="font-mono">{credentials.username}</span>
            </p>
            <p>
              Temporary password: <span className="font-mono">{credentials.temporaryPassword}</span>
            </p>
            <p className="text-xs text-green-700 mt-1">
              Share these with the employee so they can log in and record their own attendance.
            </p>
          </div>
          <button
            onClick={() => setCredentials(null)}
            className="text-green-700 hover:text-green-900 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">ID</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Work Email</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Department</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Designation</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Role</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fetching ? (
              <TableSkeletonRows columns={8} />
            ) : employees.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={8}>
                  No employees yet. Click + to add your first one.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{emp.employeeId}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{emp.name}</td>
                  <td className="px-4 py-3 text-slate-600">{emp.workEmail}</td>
                  <td className="px-4 py-3 text-slate-600">{emp.department || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{emp.designation || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{emp.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        emp.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {emp.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => handleToggleActive(emp)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      {emp.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(emp)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showCreate} onClose={closeCreate} placement="center" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Add Employee</ModalHeader>
          <ModalBody>
            <form id="add-employee-form" onSubmit={handleCreate} className="grid grid-cols-1 gap-4">
              <FormField
                label="First name"
                placeholder="John"
                isRequired
                value={form.firstName}
                onChange={(v) => updateField("firstName", v)}
              />
              <FormField
                label="Middle name"
                placeholder="Michael"
                value={form.middleName}
                onChange={(v) => updateField("middleName", v)}
              />
              <FormField
                label="Last name"
                placeholder="Doe"
                isRequired
                value={form.lastName}
                onChange={(v) => updateField("lastName", v)}
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
                label="Department"
                placeholder="Engineering"
                value={form.department}
                onChange={(v) => updateField("department", v)}
              />
              <FormField
                label="Designation"
                placeholder="Software Engineer"
                value={form.designation}
                onChange={(v) => updateField("designation", v)}
              />
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => updateField("role", e.target.value as "staff" | "admin")}
                  className={inputClass}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={closeCreate}>
              Cancel
            </Button>
            <Button color="primary" type="submit" form="add-employee-form" isLoading={submitting}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
