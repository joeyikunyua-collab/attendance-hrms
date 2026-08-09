import Announcement, { AnnouncementDocument } from "../models/Announcement";

export const announcementRepository = {
  findAllSorted() {
    return Announcement.find().sort({ pinned: -1, createdAt: -1 }).lean<AnnouncementDocument[]>();
  },

  create(data: Partial<AnnouncementDocument>) {
    return Announcement.create(data);
  },

  findByIdAndDelete(id: string) {
    return Announcement.findByIdAndDelete(id);
  },

  /** Idempotent - $addToSet is a no-op if the user already acknowledged. */
  acknowledge(id: string, userId: string) {
    return Announcement.findByIdAndUpdate(id, { $addToSet: { acknowledgedBy: userId } }, { new: true });
  },
};
