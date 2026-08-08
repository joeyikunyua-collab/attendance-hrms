import Notification, { NotificationDocument } from "../models/Notification";

export const notificationRepository = {
  find(recipientId: string, opts: { skip?: number; limit?: number }) {
    let query = Notification.find({ recipient: recipientId }).sort({ createdAt: -1 });
    if (typeof opts.skip === "number") query = query.skip(opts.skip);
    if (typeof opts.limit === "number") query = query.limit(opts.limit);
    return query.lean();
  },

  count(recipientId: string) {
    return Notification.countDocuments({ recipient: recipientId });
  },

  countUnread(recipientId: string) {
    return Notification.countDocuments({ recipient: recipientId, read: false });
  },

  markAllRead(recipientId: string) {
    return Notification.updateMany({ recipient: recipientId, read: false }, { read: true });
  },

  create(data: Partial<NotificationDocument>) {
    return Notification.create(data);
  },

  insertMany(data: Partial<NotificationDocument>[]) {
    return Notification.insertMany(data);
  },

  findByRecipientAndDedupeKey(recipientId: string, dedupeKey: string) {
    return Notification.findOne({ recipient: recipientId, dedupeKey }).select("_id").lean();
  },
};
