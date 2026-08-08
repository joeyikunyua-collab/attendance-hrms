import { useEffect, useState } from "react";
import api from "@/lib/axios";
import type { Notification } from "@/types";

const POLL_INTERVAL_MS = 30000;

/**
 * Polls the unread notification count in the background (so the bell badge
 * stays fresh without the user opening it), and fetches the full list
 * on-demand when the notification popover is opened.
 */
export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  function refetchCount() {
    api
      .get<{ count: number }>("/notifications/unread-count")
      .then((res) => setUnreadCount(res.data.count))
      .catch(() => {});
  }

  useEffect(() => {
    refetchCount();
    const id = setInterval(refetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadList() {
    setLoading(true);
    api
      .get<{ notifications: Notification[] }>("/notifications", { params: { limit: 20 } })
      .then((res) => setNotifications(res.data.notifications))
      .finally(() => setLoading(false));
  }

  function markAllRead() {
    api.post("/notifications/mark-read").then(() => {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  }

  return { unreadCount, notifications, loading, loadList, markAllRead };
}
