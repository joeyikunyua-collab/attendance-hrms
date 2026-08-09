import type { Request, Response } from "express";
import { announcementService } from "../services/announcement.service";

async function list(req: Request, res: Response) {
  const announcements = await announcementService.list(req.user!.id);
  res.status(200).json({ announcements });
}

async function create(req: Request, res: Response) {
  const announcement = await announcementService.create(req.user!, req.body);
  res.status(201).json({ announcement });
}

async function acknowledge(req: Request, res: Response) {
  const announcement = await announcementService.acknowledge(req.params.id, req.user!.id);
  res.status(200).json({ announcement });
}

async function remove(req: Request, res: Response) {
  await announcementService.remove(req.params.id);
  res.status(200).json({ ok: true });
}

export const announcementController = {
  list,
  create,
  acknowledge,
  remove,
};
