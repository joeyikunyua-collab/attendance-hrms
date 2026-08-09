import { useEffect, useState } from "react";
import { addToast } from "@heroui/react";
import { X, Pin, Clock, CheckCircle2 } from "lucide-react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import Avatar from "@/components/panels/attendance/dashboard/Avatar";
import CategoryBadge from "./CategoryBadge";
import type { Announcement } from "@/types";

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Full-detail dialog for a single announcement, opened from the feed's
 * "Read More" trigger. Hand-rolled (not the HeroUI Modal used elsewhere in
 * this app) so the backdrop/blur/layout can match the reference spec
 * exactly, matching the same pattern already used for the audit/profile
 * side-drawers.
 */
export default function AnnouncementDialog({
  announcement,
  onClose,
  onAcknowledged,
}: {
  announcement: Announcement | null;
  onClose: () => void;
  onAcknowledged: (updated: Announcement) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!announcement) {
      setVisible(false);
      return;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [announcement]);

  useEffect(() => {
    if (!announcement) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [announcement, onClose]);

  if (!announcement) return null;

  async function handleAcknowledge() {
    if (!announcement) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ announcement: Announcement }>(`/announcements/${announcement._id}/acknowledge`);
      onAcknowledged(res.data.announcement);
    } catch (err) {
      addToast({
        title: "Couldn't acknowledge",
        description: getErrorMessage(err, "Something went wrong. Please try again."),
        severity: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={announcement.title}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg bg-white rounded-2xl shadow-2xl transition-all duration-200 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CategoryBadge category={announcement.category} />
              {announcement.pinned && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                  <Pin className="w-3 h-3 fill-current" />
                  Pinned
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-slate-900 mt-2">{announcement.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta bar */}
        <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50/60 border-b border-slate-100">
          <Avatar name={announcement.authorName} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{announcement.authorName}</p>
            <p className="text-xs text-slate-500 truncate">{announcement.authorDesignation}</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-slate-400 shrink-0">
            <Clock className="w-3 h-3" />
            {formatTimestamp(announcement.createdAt)}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[50vh] overflow-y-auto">
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{announcement.body}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            {announcement.acknowledgedCount > 0
              ? `${announcement.acknowledgedCount} ${announcement.acknowledgedCount === 1 ? "person has" : "people have"} acknowledged`
              : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-lg hover:bg-slate-100"
            >
              Close
            </button>
            {announcement.acknowledgedByMe ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
                Acknowledged
              </span>
            ) : (
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? "Saving…" : "Acknowledge"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
