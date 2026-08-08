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

export const manualEntrySchema = z.object({
  employeeId: z.string({ required_error: "employeeId is required" }).min(1, "employeeId is required"),
  date: z.string({ required_error: "date is required" }).min(1, "date is required"),
  checkIn: z.string().nullable().optional(),
  checkOut: z.string().nullable().optional(),
  status: z.enum(["present", "late", "absent"]).optional(),
});

export const resolveExceptionSchema = z.object({
  auditNote: z.string().nullable().optional(),
});
