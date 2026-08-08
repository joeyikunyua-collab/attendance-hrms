import { announcementRepository } from "../repositories/announcement.repository";
import { notificationService } from "./notification.service";
import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../types";
import type { AnnouncementCategory } from "../models/Announcement";

async function list() {
  return announcementRepository.findAllSorted();
}

async function create(
  author: AuthUser,
  body: { title?: string; body?: string; category?: AnnouncementCategory; pinned?: boolean }
) {
  if (!body.title || !body.body) {
    throw new ApiError(400, "Title and body are required");
  }

  const announcement = await announcementRepository.create({
    title: body.title.trim(),
    body: body.body.trim(),
    category: body.category ?? "company_update",
    pinned: Boolean(body.pinned),
    authorId: author.id as never,
    authorName: author.name,
  });

  // Company-wide posts are worth surfacing in the notification bell too,
  // not just the feed - skip the author so they don't get notified of their
  // own post.
  await notificationService.notifyAllUsers(
    {
      type: "announcement_posted",
      title: "New company announcement",
      body: `${author.name} posted "${announcement.title}".`,
    },
    author.id
  );

  return announcement;
}

async function remove(id: string) {
  const announcement = await announcementRepository.findByIdAndDelete(id);
  if (!announcement) throw new ApiError(404, "Announcement not found");
}

export const announcementService = {
  list,
  create,
  remove,
};
