import TeamRequestsPanel from "@/components/panels/requests/TeamRequestsPanel";
import ManagerApprovalsPanel from "@/components/panels/requests/ManagerApprovalsPanel";
import MyRequestsList from "@/components/panels/requests/MyRequestsList";
import type { AuthUser } from "@/types";

export default function RequestsPanel({ user }: { user: AuthUser }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 mb-1">Requests</h1>
        <p className="text-sm text-slate-500">
          {user.role === "admin"
            ? "Review your team's time-off requests, and submit your own."
            : "Apply for time off and track your requests."}
        </p>
      </div>

      {user.role === "admin" && <TeamRequestsPanel />}
      {/* Visible to anyone with direct reports, admin or not - being a
          manager here just means someone else's employee record points at
          you, so a staff-role team lead still needs their own queue. */}
      <ManagerApprovalsPanel />
      <MyRequestsList />
    </div>
  );
}
