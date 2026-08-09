import type { Request, Response } from "express";
import { leaveRequestService } from "../services/leaveRequest.service";

async function create(req: Request, res: Response) {
  const request = await leaveRequestService.create(req.user!, req.body);
  res.status(201).json({ request });
}

async function listMine(req: Request, res: Response) {
  const requests = await leaveRequestService.listMine(req.user!.id);
  res.status(200).json({ requests });
}

async function listAll(req: Request, res: Response) {
  const scope = req.query.scope === "history" ? "history" : "pending";
  const requests = await leaveRequestService.listAll(scope);
  res.status(200).json({ requests });
}

async function listForReview(req: Request, res: Response) {
  const requests = await leaveRequestService.listForReview(req.user!.id);
  res.status(200).json({ requests });
}

async function balance(req: Request, res: Response) {
  const balances = await leaveRequestService.balance(req.user!.id);
  res.status(200).json({ balances });
}

async function approve(req: Request, res: Response) {
  const request = await leaveRequestService.review(req.params.id, req.user!, "approved", req.body.note);
  res.status(200).json({ request });
}

async function reject(req: Request, res: Response) {
  const request = await leaveRequestService.review(req.params.id, req.user!, "rejected", req.body.note);
  res.status(200).json({ request });
}

async function cancel(req: Request, res: Response) {
  const request = await leaveRequestService.cancel(req.params.id, req.user!);
  res.status(200).json({ request });
}

export const leaveRequestController = {
  create,
  listMine,
  listAll,
  listForReview,
  balance,
  approve,
  reject,
  cancel,
};
