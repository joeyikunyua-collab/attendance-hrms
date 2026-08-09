import { useEffect, useState } from "react";
import { Mail, MapPin, CalendarDays, Briefcase, Building2, UserCog, Hash } from "lucide-react";
import Layout from "@/components/Layout";
import Avatar from "@/components/panels/attendance/dashboard/Avatar";
import EmployeeStatusBadge from "@/components/panels/employees/EmployeeStatusBadge";
import { useAuth } from "@/lib/useAuth";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import type { Employee } from "@/types";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function formatEmploymentType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm text-slate-700 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ employee: Employee }>("/employees/me")
      .then((res) => setEmployee(res.data.employee))
      .catch((err) => setError(getErrorMessage(err, "No employee record is linked to this account.")))
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  return (
    <Layout user={user}>
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5 mb-6">Your personal and organizational information.</p>

        {fetching ? (
          <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
        ) : error || !employee ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-sm text-slate-500">{error}</div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <Avatar name={employee.name} photoUrl={employee.photoUrl} />
              <div className="min-w-0">
                <p className="text-lg font-semibold text-slate-900 truncate">{employee.name}</p>
                <p className="text-sm text-slate-500 truncate">{employee.designation || "—"}</p>
              </div>
              <div className="ml-auto shrink-0">
                <EmployeeStatusBadge status={employee.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow icon={Hash} label="Employee ID" value={employee.employeeId} />
              <InfoRow icon={Mail} label="Work Email" value={employee.workEmail} />
              <InfoRow icon={Building2} label="Department" value={employee.department || "—"} />
              <InfoRow icon={Briefcase} label="Employment Type" value={formatEmploymentType(employee.employmentType)} />
              <InfoRow icon={CalendarDays} label="Hire Date" value={formatDate(employee.hireDate)} />
              <InfoRow icon={CalendarDays} label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
              <InfoRow icon={MapPin} label="Office Location" value={employee.officeLocation || "—"} />
              <InfoRow icon={UserCog} label="Direct Manager" value={employee.manager?.name ?? "No manager on file"} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
