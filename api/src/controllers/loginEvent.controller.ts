import type { Request, Response } from "express";
import { loginEventService } from "../services/loginEvent.service";

async function list(_req: Request, res: Response) {
  const events = await loginEventService.list();
  res.status(200).json({ events });
}

export const loginEventController = {
  list,
};
