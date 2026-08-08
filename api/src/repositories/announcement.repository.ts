import Announcement, { AnnouncementDocument } from "../models/Announcement";

export const announcementRepository = {
  findAllSorted() {
    return Announcement.find().sort({ pinned: -1, createdAt: -1 }).lean();
  },

  create(data: Partial<AnnouncementDocument>) {
    return Announcement.create(data);
  },

  findByIdAndDelete(id: string) {
    return Announcement.findByIdAndDelete(id);
  },
};
