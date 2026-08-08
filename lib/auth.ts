import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { AuthUser } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "Missing JWT_SECRET environment variable. Add it to .env.local (see .env.local.example)."
  );
}

const secretKey = new TextEncoder().encode(JWT_SECRET);
const TOKEN_TTL = "8h";
export const AUTH_COOKIE_NAME = "attendance_token";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// Default login password assigned to every employee account created from the Employees page.
export const DEFAULT_EMPLOYEE_PASSWORD = "Welcome@123";

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

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
 * database (see lib/apiAuth.ts#requireUser) before trusting this token.
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
