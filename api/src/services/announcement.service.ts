import { announcementRepository } from "../repositories/announcement.repository";
import { employeeRepository } from "../repositories/employee.repository";
import { settingsRepository } from "../repositories/settings.repository";
import { notificationService } from "./notification.service";
import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../types";
import type { AnnouncementCategory, AnnouncementDocument } from "../models/Announcement";

/** Strips the raw acknowledger list (don't leak everyone's identity to
 * everyone) down to what the client actually needs: whether *this* user has
 * acknowledged, and how many people total have. Also defends against posts
 * created before `acknowledgedBy`/`authorDesignation` existed on the schema -
 * those documents simply don't have the fields in the DB, so `.lean()` reads
 * return them as `undefined` rather than the schema's `default`. */
function forViewer<T extends { acknowledgedBy?: unknown[]; authorDesignation?: string }>(
  announcement: T,
  userId: string
) {
  const { acknowledgedBy, ...rest } = announcement;
  const ids = acknowledgedBy ?? [];
  return {
    ...rest,
    authorDesignation: announcement.authorDesignation ?? "",
    acknowledgedCount: ids.length,
    acknowledgedByMe: ids.some((id) => String(id) === userId),
  };
}

async function list(userId: string) {
  const announcements = await announcementRepository.findAllSorted();
  return announcements.map((a) => forViewer(a, userId));
}

async function create(
  author: AuthUser,
  body: { title?: string; body?: string; category?: AnnouncementCategory; pinned?: boolean }
) {
  if (!body.title || !body.body) {
    throw new ApiError(400, "Title and body are required");
  }

  const { announcementCategories } = await settingsRepository.getLean();
  const category = body.category || announcementCategories[0]?.key || "company_update";
  if (!announcementCategories.some((c) => c.key === category)) {
    throw new ApiError(400, "That category is no longer available - please choose another");
  }

  const employee = await employeeRepository.findByUser(author.id);
  const authorDesignation =
    employee?.designation || (author.role === "admin" ? "Administrator" : "Staff");

  const announcement = await announcementRepository.create({
    title: body.title.trim(),
    body: body.body.trim(),
    category,
    pinned: Boolean(body.pinned),
    authorId: author.id as never,
    authorName: author.name,
    authorDesignation,
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

  return forViewer(announcement.toObject() as AnnouncementDocument, author.id);
}

async function acknowledge(id: string, userId: string) {
  const announcement = await announcementRepository.acknowledge(id, userId);
  if (!announcement) throw new ApiError(404, "Announcement not found");
  return forViewer(announcement.toObject() as AnnouncementDocument, userId);
}

async function remove(id: string) {
  const announcement = await announcementRepository.findByIdAndDelete(id);
  if (!announcement) throw new ApiError(404, "Announcement not found");
}

export const announcementService = {
  list,
  create,
  acknowledge,
  remove,
};
