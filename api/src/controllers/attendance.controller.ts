import type { Request, Response } from "express";
import { attendanceService } from "../services/attendance.service";

async function list(req: Request, res: Response) {
  const { records, total } = await attendanceService.list(req.user!, req.query as never);
  res.status(200).json({ records, total });
}

async function checkIn(req: Request, res: Response) {
  const record = await attendanceService.checkIn(req.user!, req.body);
  res.status(201).json({ record });
}

async function checkOut(req: Request, res: Response) {
  const record = await attendanceService.checkOut(req.user!, req.params.id, req.body);
  res.status(200).json({ record });
}

async function remove(req: Request, res: Response) {
  await attendanceService.remove(req.user!, req.params.id);
  res.status(200).json({ ok: true });
}

async function checkinReminder(req: Request, res: Response) {
  const result = await attendanceService.checkinReminder(req.user!);
  res.status(result.created ? 201 : 200).json(result);
}

export const attendanceController = {
  list,
  checkIn,
  checkOut,
  remove,
  checkinReminder,
};
