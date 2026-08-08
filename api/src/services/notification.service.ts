import { userRepository } from "../repositories/user.repository";
import { notificationRepository } from "../repositories/notification.repository";
import type { NotificationType } from "../types";

/** Fans a notification out to every admin (optionally excluding one, e.g. the
 * admin who triggered the event themselves). Only invoke this after the
 * triggering write succeeds. */
async function notifyAdmins(
  notification: { type: NotificationType; title: string; body: string },
  excludeUserId?: string
) {
  const admins = await userRepository.findAdmins(excludeUserId);
  if (!admins.length) return;

  await notificationRepository.insertMany(
    admins.map((a) => ({ recipient: a._id, ...notification } as never))
  );
}

/** Creates a single notification for one specific user (e.g. a self-notification
 * for the employee who just performed an action). */
async function notifyUser(
  userId: string,
  notification: { type: NotificationType; title: string; body: string }
) {
  await notificationRepository.create({ recipient: userId, ...notification } as never);
}

async function list(recipientId: string, opts: { skip?: number; limit?: number }) {
  const isPaginated = typeof opts.limit === "number";
  const [notifications, total] = await Promise.all([
    notificationRepository.find(recipientId, opts),
    isPaginated ? notificationRepository.count(recipientId) : Promise.resolve(undefined),
  ]);
  return { notifications, total };
}

async function markAllRead(recipientId: string) {
  await notificationRepository.markAllRead(recipientId);
}

async function unreadCount(recipientId: string) {
  return notificationRepository.countUnread(recipientId);
}

export const notificationService = {
  notifyAdmins,
  notifyUser,
  list,
  markAllRead,
  unreadCount,
};
