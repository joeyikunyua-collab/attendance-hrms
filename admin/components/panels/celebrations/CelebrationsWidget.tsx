import { useEffect, useMemo, useState } from "react";
import { PartyPopper, Cake, Award, MessageCircleHeart } from "lucide-react";
import api from "@/lib/axios";
import Avatar from "@/components/panels/attendance/dashboard/Avatar";
import SendWishModal from "./SendWishModal";
import { buildCelebrations, formatCelebrationDate, type Celebration } from "./celebrationUtils";
import type { CelebrationEmployee } from "@/types";

const UPCOMING_WINDOW_DAYS = 14;

function CelebrationRow({ celebration, onSendWish }: { celebration: Celebration; onSendWish: (c: Celebration) => void }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar name={celebration.name} photoUrl={celebration.photoUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 truncate">{celebration.name}</p>
        <p className="text-[11px] text-slate-400 truncate">{celebration.designation || "—"}</p>
      </div>
      <div className="text-right shrink-0">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            celebration.type === "birthday" ? "bg-fuchsia-50 text-fuchsia-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {celebration.type === "birthday" ? <Cake className="w-3 h-3" /> : <Award className="w-3 h-3" />}
          {celebration.type === "birthday" ? "Birthday" : `${celebration.years} Year${celebration.years === 1 ? "" : "s"}`}
        </span>
        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{formatCelebrationDate(celebration.occursOn)}</p>
      </div>
      <button
        type="button"
        onClick={() => onSendWish(celebration)}
        aria-label={`Send wish to ${celebration.name}`}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 shrink-0"
      >
        <MessageCircleHeart className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function CelebrationsWidget() {
  const [employees, setEmployees] = useState<CelebrationEmployee[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"today" | "upcoming">("today");
  const [wishTarget, setWishTarget] = useState<Celebration | null>(null);

  useEffect(() => {
    api
      .get<{ employees: CelebrationEmployee[] }>("/employees/celebrations")
      .then((res) => setEmployees(res.data.employees))
      .finally(() => setFetching(false));
  }, []);

  const celebrations = useMemo(() => buildCelebrations(employees), [employees]);
  const today = useMemo(() => celebrations.filter((c) => c.daysUntil === 0), [celebrations]);
  const upcoming = useMemo(
    () => celebrations.filter((c) => c.daysUntil > 0 && c.daysUntil <= UPCOMING_WINDOW_DAYS),
    [celebrations]
  );
  const activeList = tab === "today" ? today : upcoming;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PartyPopper className="w-4 h-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Celebrations</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab("today")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              tab === "today" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Today {today.length > 0 && `(${today.length})`}
          </button>
          <button
            type="button"
            onClick={() => setTab("upcoming")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              tab === "upcoming" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Upcoming
          </button>
        </div>
      </div>

      {fetching ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-11 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">
          {tab === "today" ? "No birthdays or anniversaries today." : "Nothing in the next two weeks."}
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {activeList.map((c) => (
            <CelebrationRow key={`${c.employeeId}-${c.type}`} celebration={c} onSendWish={setWishTarget} />
          ))}
        </div>
      )}

      <SendWishModal celebration={wishTarget} onClose={() => setWishTarget(null)} />
    </div>
  );
}
