import type { Request, Response } from "express";
import { employeeService } from "../services/employee.service";

async function list(_req: Request, res: Response) {
  const employees = await employeeService.list();
  res.status(200).json({ employees });
}

async function me(req: Request, res: Response) {
  const employee = await employeeService.me(req.user!.id);
  res.status(200).json({ employee });
}

async function create(req: Request, res: Response) {
  const result = await employeeService.create(req.user!, req.body);
  res.status(201).json(result);
}

async function update(req: Request, res: Response) {
  const employee = await employeeService.update(req.params.id, req.body);
  res.status(200).json({ employee });
}

async function remove(req: Request, res: Response) {
  await employeeService.remove(req.params.id);
  res.status(200).json({ ok: true });
}

export const employeeController = {
  list,
  me,
  create,
  update,
  remove,
};
