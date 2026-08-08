import { useEffect, useMemo, useState } from "react";
import { SearchField, Group, Input, Label } from "react-aria-components";
import LocationModal, { EyeIcon } from "@/components/LocationModal";
import DateFilterField, { dateGroupClass } from "@/components/DateFilterField";
import { TableSkeletonRows } from "@/components/Skeleton";
import { employeeRefName } from "@/lib/employeeRef";
import api from "@/lib/axios";
import type { AttendanceRecord, AuthUser } from "@/types";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  late: "bg-amber-100 text-amber-700",
  absent: "bg-red-100 text-red-700",
};

const PAGE_SIZE = 20;

export default function ReportsPanel({ user }: { user: AuthUser }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [locationRecord, setLocationRecord] = useState<AttendanceRecord | null>(null);

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(daysAgo(0));

  function runSearch() {
    setFetching(true);
    api
      .get<{ records: AttendanceRecord[]; total: number }>("/attendance", {
        params: { from, to, limit: PAGE_SIZE, skip: 0 },
      })
      .then((res) => {
        setRecords(res.data.records);
        setTotal(res.data.total);
      })
      .finally(() => setFetching(false));
  }

  function loadMore() {
    setLoadingMore(true);
    api
      .get<{ records: AttendanceRecord[]; total: number }>("/attendance", {
        params: { from, to, limit: PAGE_SIZE, skip: records.length },
      })
      .then((res) => {
        setRecords((prev) => [...prev, ...res.data.records]);
        setTotal(res.data.total);
      })
      .finally(() => setLoadingMore(false));
  }

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((r) => {
      const name = typeof r.employee === "string" ? "" : employeeRefName(r.employee);
      return name.toLowerCase().includes(query);
    });
  }, [records, search]);

  const isAdmin = user.role === "admin";
  const columnCount = isAdmin ? 6 : 4;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-6">
        {isAdmin ? "Attendance History" : "My Attendance History"}
      </h1>

      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 flex flex-wrap gap-4 items-end">
        {isAdmin && (
          <SearchField value={search} onChange={setSearch} aria-label="Search by employee name" className="w-64">
            <Label className="block text-xs text-slate-500 mb-1">Search employee</Label>
            <Group className={dateGroupClass}>
              <svg
                className="w-4 h-4 text-slate-400 shrink-0"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="9" cy="9" r="6" />
                <path d="M17 17l-4-4" strokeLinecap="round" />
              </svg>
              <Input placeholder="Search..." className="flex-1 outline-none" />
            </Group>
          </SearchField>
        )}

        <DateFilterField label="From" value={from} onChange={setFrom} />
        <DateFilterField label="To" value={to} onChange={setTo} />

        <button
          onClick={runSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md px-4 py-1.5"
        >
          Search
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
              {isAdmin && (
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Employee</th>
              )}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Check-in</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Check-out</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fetching ? (
              <TableSkeletonRows columns={columnCount} />
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={columnCount}>
                  No records found for this filter.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => {
                const hasLocation =
                  (r.checkInLatitude !== null && r.checkInLongitude !== null) ||
                  (r.checkOutLatitude !== null && r.checkOutLongitude !== null);
                return (
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600">{r.date}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {typeof r.employee === "string" ? r.employee : employeeRefName(r.employee)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(r.checkIn)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(r.checkOut)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          STATUS_BADGE_CLASS[r.status] ?? "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {hasLocation && (
                          <button
                            onClick={() => setLocationRecord(r)}
                            title="View location"
                            aria-label="View location"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!fetching && records.length > 0 && !search.trim() && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-slate-500">
            Showing {records.length} of {total} record{total === 1 ? "" : "s"}
          </p>
          {records.length < total && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-60 border border-blue-200 rounded-md px-3 py-1.5"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}

      {locationRecord && (
        <LocationModal
          isOpen
          onClose={() => setLocationRecord(null)}
          title={
            (typeof locationRecord.employee === "string"
              ? locationRecord.employee
              : employeeRefName(locationRecord.employee)) + ` · ${locationRecord.date}`
          }
          entries={[
            {
              label: "Check-in",
              time: formatDateTime(locationRecord.checkIn),
              latitude: locationRecord.checkInLatitude,
              longitude: locationRecord.checkInLongitude,
            },
            {
              label: "Check-out",
              time: formatDateTime(locationRecord.checkOut),
              latitude: locationRecord.checkOutLatitude,
              longitude: locationRecord.checkOutLongitude,
            },
          ]}
        />
      )}
    </div>
  );
}
