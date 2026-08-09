import { useState, useEffect, type FormEvent } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, addToast } from "@heroui/react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { useSettings } from "@/lib/SettingsContext";
import type { Announcement, AnnouncementCategory } from "@/types";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export default function PostAnnouncementModal({
  isOpen,
  onClose,
  onPosted,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPosted: () => void;
}) {
  const { settings } = useSettings();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("");
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const defaultCategory = settings.announcementCategories[0]?.key ?? "";

  useEffect(() => {
    if (!category && defaultCategory) setCategory(defaultCategory);
  }, [category, defaultCategory]);

  function reset() {
    setTitle("");
    setBody("");
    setCategory(defaultCategory);
    setPinned(false);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !body.trim()) {
      setError("Title and body are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post<{ announcement: Announcement }>("/announcements", { title, body, category, pinned });
      addToast({ title: "Announcement posted", description: "Everyone will see it in their feed.", severity: "success" });
      reset();
      onPosted();
      onClose();
    } catch (err) {
      const message = getErrorMessage(err, "Failed to post announcement");
      setError(message);
      addToast({ title: "Failed to post announcement", description: message, severity: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      placement="center"
      scrollBehavior="inside"
      size="xl"
    >
      <ModalContent>
        <ModalHeader>Post announcement</ModalHeader>
        <ModalBody>
          <form id="post-announcement-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Office closed for the holiday" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Write the full announcement..."
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                  {settings.announcementCategories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="rounded border-slate-300" />
                  Pin to top of feed
                </label>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" type="submit" form="post-announcement-form" isLoading={submitting}>
            Post announcement
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
