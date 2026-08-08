import { z } from "zod";

const LOGIN_REQUIRED_MSG = "Username and password are required";

export const loginSchema = z.object({
  username: z.string({ required_error: LOGIN_REQUIRED_MSG }).min(1, LOGIN_REQUIRED_MSG),
  password: z.string({ required_error: LOGIN_REQUIRED_MSG }).min(1, LOGIN_REQUIRED_MSG),
});

export const setPasswordSchema = z.object({
  newPassword: z.string({ required_error: "New password is required" }).min(
    1,
    "New password is required"
  ),
});

export const loginLocationSchema = z.object({
  loginEventId: z.string({ required_error: "loginEventId is required" }).min(
    1,
    "loginEventId is required"
  ),
  latitude: z.unknown().optional(),
  longitude: z.unknown().optional(),
  accuracy: z.unknown().optional(),
  error: z.unknown().optional(),
});
