import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env";
import type { AuthUser } from "../types";

const secretKey = new TextEncoder().encode(env.JWT_SECRET);
const TOKEN_TTL = "8h";
export const AUTH_COOKIE_NAME = "attendance_token";

export async function signAuthToken(user: AuthUser, tokenVersion: number): Promise<string> {
  return new SignJWT({ ...user, tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secretKey);
}

/**
 * Verifies the JWT signature/shape only. Does NOT confirm the user still
 * exists or that the token hasn't been revoked - callers must additionally
 * compare the returned tokenVersion against the current value in the
 * database (see middleware/auth.middleware.ts) before trusting this token.
 */
export async function verifyAuthToken(
  token: string
): Promise<(AuthUser & { tokenVersion: number }) | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    const { id, username, name, role, tokenVersion } = payload as Record<string, unknown>;
    if (
      typeof id === "string" &&
      typeof username === "string" &&
      typeof name === "string" &&
      (role === "admin" || role === "staff") &&
      typeof tokenVersion === "number"
    ) {
      return { id, username, name, role, tokenVersion };
    }
    return null;
  } catch {
    return null;
  }
}
