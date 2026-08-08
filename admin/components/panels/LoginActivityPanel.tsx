import { useEffect, useState } from "react";
import { TableSkeletonRows } from "@/components/Skeleton";
import api from "@/lib/axios";
import type { LoginEvent } from "@/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LoginActivityPanel() {
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api
      .get<{ events: LoginEvent[] }>("/login-events")
      .then((res) => setEvents(res.data.events))
      .finally(() => setFetching(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-6">Login Activity</h1>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">User</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Role</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Logged in at</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fetching ? (
              <TableSkeletonRows columns={4} />
            ) : events.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                  No login activity recorded yet.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{event.name}</div>
                    <div className="text-xs text-slate-400">{event.username}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        event.role === "admin"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {event.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(event.loggedInAt)}</td>
                  <td className="px-4 py-3">
                    {event.latitude !== null && event.longitude !== null ? (
                      <a
                        href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                      </a>
                    ) : event.locationError ? (
                      <span className="text-slate-400">{event.locationError}</span>
                    ) : (
                      <span className="text-slate-400">Pending...</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
