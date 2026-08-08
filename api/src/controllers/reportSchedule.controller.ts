import type { Request, Response } from "express";
import { reportScheduleService } from "../services/reportSchedule.service";

async function create(req: Request, res: Response) {
  const schedule = await reportScheduleService.create(req.user!, req.body);
  res.status(201).json({ schedule });
}

async function list(_req: Request, res: Response) {
  const schedules = await reportScheduleService.list();
  res.status(200).json({ schedules });
}

async function remove(req: Request, res: Response) {
  await reportScheduleService.remove(req.params.id);
  res.status(200).json({ ok: true });
}

export const reportScheduleController = {
  create,
  list,
  remove,
};
