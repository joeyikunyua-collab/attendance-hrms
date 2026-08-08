import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError";

/** Validates req.body against `schema`, replacing it with the parsed
 * (and thus type-coerced/defaulted) value on success, or throwing a 400
 * with zod's first issue message on failure. */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Invalid request body";
      throw new ApiError(400, message);
    }
    req.body = result.data;
    next();
  };
}
