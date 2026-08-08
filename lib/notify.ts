import User from "@/models/User";
import Notification from "@/models/Notification";
import type { NotificationType } from "@/types";

/** Fans a notification out to every admin (optionally excluding one, e.g. the
 * admin who triggered the event themselves). Caller must already have called
 * connectToDatabase() and only invoke this after the triggering write succeeds. */
export async function notifyAdmins(
  notification: { type: NotificationType; title: string; body: string },
  excludeUserId?: string
) {
  const filter: Record<string, unknown> = { role: "admin" };
  if (excludeUserId) filter._id = { $ne: excludeUserId };

  const admins = await User.find(filter).select("_id").lean<{ _id: unknown }[]>();
  if (!admins.length) return;

  await Notification.insertMany(
    admins.map((a) => ({ recipient: a._id, ...notification }))
  );
}

/** Creates a single notification for one specific user (e.g. a self-notification
 * for the employee who just performed an action). */
export async function notifyUser(
  userId: string,
  notification: { type: NotificationType; title: string; body: string }
) {
  await Notification.create({ recipient: userId, ...notification });
}
