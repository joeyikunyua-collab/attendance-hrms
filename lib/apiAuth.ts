import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import type { AuthUser } from "@/types";

/**
 * Checks the auth cookie on an API request, then confirms against the
 * database that the user still exists and that the token hasn't been
 * revoked (tokenVersion match) - so deactivating/deleting an account takes
 * effect on the very next request instead of waiting out the token's TTL.
 * Also returns the user's current role/name from the database rather than
 * the token's (possibly stale) copy, so role changes apply immediately too.
 * Already writes a 401 response and returns null when rejected - callers
 * should return immediately when they get null back.
 */
export async function requireUser(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthUser | null> {
  const token = req.cookies[AUTH_COOKIE_NAME];
  const payload = token ? await verifyAuthToken(token) : null;

  if (!payload) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  await connectToDatabase();
  const dbUser = await User.findById(payload.id).lean<{
    username: string;
    name: string;
    role: "admin" | "staff";
    tokenVersion: number;
    mustChangePassword: boolean;
  } | null>();

  if (!dbUser || (dbUser.tokenVersion ?? 0) !== payload.tokenVersion) {
    res.status(401).json({ message: "Session expired. Please log in again." });
    return null;
  }

  return {
    id: payload.id,
    username: dbUser.username,
    name: dbUser.name,
    role: dbUser.role,
    mustChangePassword: dbUser.mustChangePassword ?? false,
  };
}

/**
 * Same as requireUser, but also rejects non-admins with a 403. Already writes
 * the response and returns null when access is denied - callers should
 * return immediately when they get null back.
 */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthUser | null> {
  const user = await requireUser(req, res);
  if (!user) return null;

  if (user.role !== "admin") {
    res.status(403).json({ message: "Admins only" });
    return null;
  }

  return user;
}
