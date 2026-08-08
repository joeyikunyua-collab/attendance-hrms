import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "../utils/token";
import { userRepository } from "../repositories/user.repository";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import type { AuthUser } from "../types";

/**
 * Checks the auth cookie on a request, then confirms against the database
 * that the user still exists and that the token hasn't been revoked
 * (tokenVersion match) - so deactivating/deleting an account takes effect on
 * the very next request instead of waiting out the token's TTL. Also reads
 * the user's current role/name from the database rather than the token's
 * (possibly stale) copy, so role changes apply immediately too.
 */
export const requireUser = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  const payload = token ? await verifyAuthToken(token) : null;

  if (!payload) {
    throw new ApiError(401, "Not authenticated");
  }

  const dbUser = await userRepository.findByIdLean(payload.id);
  if (!dbUser || (dbUser.tokenVersion ?? 0) !== payload.tokenVersion) {
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const user: AuthUser = {
    id: payload.id,
    username: dbUser.username,
    name: dbUser.name,
    role: dbUser.role,
    mustChangePassword: dbUser.mustChangePassword ?? false,
  };
  req.user = user;
  next();
});

/** Same as requireUser, but also rejects non-admins with a 403. */
export const requireAdmin = [
  requireUser,
  (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== "admin") {
      throw new ApiError(403, "Admins only");
    }
    next();
  },
];
