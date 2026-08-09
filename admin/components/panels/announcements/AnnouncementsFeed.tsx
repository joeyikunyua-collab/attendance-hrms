import { useEffect, useState } from "react";
import { addToast } from "@heroui/react";
import { Pin, Plus, Megaphone, Trash2, ChevronRight } from "lucide-react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import CategoryBadge from "./CategoryBadge";
import PostAnnouncementModal from "./PostAnnouncementModal";
import AnnouncementDialog from "./AnnouncementDialog";
import type { Announcement, AuthUser } from "@/types";

const BODY_PREVIEW_LENGTH = 120;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function AnnouncementCard({
  announcement,
  isAdmin,
  onDeleted,
  onReadMore,
}: {
  announcement: Announcement;
  isAdmin: boolean;
  onDeleted: () => void;
  onReadMore: () => void;
}) {
  const isLong = announcement.body.length > BODY_PREVIEW_LENGTH;

  async function handleDelete() {
    if (!confirm(`Delete "${announcement.title}"?`)) return;
    try {
      await api.delete(`/announcements/${announcement._id}`);
      addToast({ title: "Announcement deleted", severity: "success" });
      onDeleted();
    } catch (err) {
      addToast({ title: "Failed to delete", description: getErrorMessage(err, "Something went wrong."), severity: "danger" });
    }
  }

  return (
    <div
      className={`group relative bg-white border rounded-2xl p-4 ${
        announcement.pinned ? "border-amber-300/80 bg-amber-50/30" : "border-slate-200/80"
      }`}
    >
      {announcement.pinned && (
        <div className="absolute top-3 right-3 text-amber-500" title="Pinned">
          <Pin className="w-3.5 h-3.5 fill-current" />
        </div>
      )}
      {isAdmin && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete announcement"
          className="absolute top-3 right-9 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      <CategoryBadge category={announcement.category} />
      <button
        type="button"
        onClick={onReadMore}
        className="block text-left text-sm font-semibold text-slate-900 mt-2 hover:text-blue-600 transition-colors"
      >
        {announcement.title}
      </button>
      <p className="text-sm text-slate-600 mt-1 line-clamp-3 whitespace-pre-line">{announcement.body}</p>
      {isLong && (
        <button
          type="button"
          onClick={onReadMore}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:text-blue-700 mt-1"
        >
          Read More
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
      <p className="text-[11px] text-slate-400 mt-3">
        {announcement.authorName} · {formatDate(announcement.createdAt)}
      </p>
    </div>
  );
}

export default function AnnouncementsFeed({ user }: { user: AuthUser }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showPost, setShowPost] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const isAdmin = user.role === "admin";

  function load() {
    setFetching(true);
    api
      .get<{ announcements: Announcement[] }>("/announcements")
      .then((res) => setAnnouncements(res.data.announcements))
      .finally(() => setFetching(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleAcknowledged(updated: Announcement) {
    setSelectedAnnouncement(updated);
    setAnnouncements((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">Company Announcements</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowPost(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Post Announcement
          </button>
        )}
      </div>

      {fetching ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No announcements yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {announcements.map((a) => (
            <AnnouncementCard
              key={a._id}
              announcement={a}
              isAdmin={isAdmin}
              onDeleted={load}
              onReadMore={() => setSelectedAnnouncement(a)}
            />
          ))}
        </div>
      )}

      <PostAnnouncementModal isOpen={showPost} onClose={() => setShowPost(false)} onPosted={load} />
      <AnnouncementDialog
        announcement={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        onAcknowledged={handleAcknowledged}
      />
    </div>
  );
}
