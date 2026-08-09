import type { Request, Response } from "express";
import { settingsService } from "../services/settings.service";

async function get(req: Request, res: Response) {
  const settings = await settingsService.get(req.user!);
  res.status(200).json({ settings });
}

async function getPublic(_req: Request, res: Response) {
  const settings = await settingsService.getPublic();
  res.status(200).json({ settings });
}

async function update(req: Request, res: Response) {
  const settings = await settingsService.update(req.user!, req.body);
  res.status(200).json({ settings });
}

export const settingsController = {
  get,
  getPublic,
  update,
};
