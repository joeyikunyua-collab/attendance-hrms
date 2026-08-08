import { z } from "zod";

export const checkInSchema = z.object({
  date: z.string({ required_error: "employeeId and date are required" }).min(
    1,
    "employeeId and date are required"
  ),
  status: z.string().optional(),
  latitude: z.unknown().optional(),
  longitude: z.unknown().optional(),
  accuracy: z.unknown().optional(),
});

export const checkOutSchema = z.object({
  action: z.string().optional(),
  latitude: z.unknown().optional(),
  longitude: z.unknown().optional(),
  accuracy: z.unknown().optional(),
});
