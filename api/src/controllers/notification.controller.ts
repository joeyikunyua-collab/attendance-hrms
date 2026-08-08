import type { Request, Response } from "express";
import { notificationService } from "../services/notification.service";

async function list(req: Request, res: Response) {
  const { notifications, total } = await notificationService.list(req.user!.id, req.query as never);
  res.status(200).json({ notifications, total });
}

async function markRead(req: Request, res: Response) {
  await notificationService.markAllRead(req.user!.id);
  res.status(200).json({ ok: true });
}

async function unreadCount(req: Request, res: Response) {
  const count = await notificationService.unreadCount(req.user!.id);
  res.status(200).json({ count });
}

export const notificationController = {
  list,
  markRead,
  unreadCount,
};
