import type { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { AUTH_COOKIE_NAME } from "../utils/token";
import { env } from "../config/env";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

async function login(req: Request, res: Response) {
  const { username, password } = req.body;
  const { token, user, loginEventId } = await authService.login(username, password);

  res.cookie(AUTH_COOKIE_NAME, token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 8 * 1000 });
  res.status(200).json({ user, loginEventId });
}

async function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, COOKIE_OPTIONS);
  res.status(200).json({ ok: true });
}

async function me(req: Request, res: Response) {
  res.status(200).json({ user: req.user });
}

async function setPassword(req: Request, res: Response) {
  await authService.setPassword(req.user!, req.body.newPassword);
  res.status(200).json({ ok: true });
}

async function recordLoginLocation(req: Request, res: Response) {
  await authService.recordLoginLocation(req.user!.id, req.body.loginEventId, req.body);
  res.status(200).json({ ok: true });
}

export const authController = {
  login,
  logout,
  me,
  setPassword,
  recordLoginLocation,
};
