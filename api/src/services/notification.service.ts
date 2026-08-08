import { userRepository } from "../repositories/user.repository";
import { notificationRepository } from "../repositories/notification.repository";
import { employeeRepository } from "../repositories/employee.repository";
import { ApiError } from "../utils/ApiError";
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

/** Fans a notification out to every user in the company (e.g. a new
 * announcement) - optionally excluding the person who triggered it. */
async function notifyAllUsers(
  notification: { type: NotificationType; title: string; body: string },
  excludeUserId?: string
) {
  const users = await userRepository.findAll(excludeUserId);
  if (!users.length) return;

  await notificationRepository.insertMany(
    users.map((u) => ({ recipient: u._id, ...notification } as never))
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

/** Admin-triggered reminder for one specific employee (e.g. from the "Not
 * Checked In" list) - reuses the same notification type as the self-service
 * checkin_reminder, just triggered by a manager instead of the employee's
 * own client. Unlike that one, this has no dedupe key: an explicit manual
 * nudge is allowed to repeat. */
async function nudgeEmployee(employeeId: string) {
  const employee = await employeeRepository.findByIdLean(employeeId);
  if (!employee || !employee.user) {
    throw new ApiError(400, "This employee has no linked login to notify");
  }

  await notificationRepository.create({
    recipient: employee.user,
    type: "checkin_reminder",
    title: "Check-in reminder",
    body: "Your manager noticed you haven't checked in yet today.",
  } as never);
}

/** Any authenticated user can send a colleague a birthday/anniversary
 * greeting from the Celebrations widget - not admin-gated, since this is
 * peer recognition rather than an administrative action. */
async function sendCelebrationWish(employeeId: string, message: string) {
  const employee = await employeeRepository.findByIdLean(employeeId);
  if (!employee || !employee.user) {
    throw new ApiError(400, "This employee has no linked login to notify");
  }

  await notificationRepository.create({
    recipient: employee.user,
    type: "celebration_wish",
    title: "You've got a greeting! 🎉",
    body: message,
  } as never);
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
  notifyAllUsers,
  notifyUser,
  nudgeEmployee,
  sendCelebrationWish,
  list,
  markAllRead,
  unreadCount,
};
