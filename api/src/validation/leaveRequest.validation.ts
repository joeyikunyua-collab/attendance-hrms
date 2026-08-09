import { z } from "zod";

const REQUIRED_MSG = "Type, start date, and end date are required";

export const createLeaveRequestSchema = z.object({
  // Not a static enum - checked against the admin-configured leave type
  // list at request time (see leaveRequestService.create()).
  type: z.string({ required_error: REQUIRED_MSG }).min(1, REQUIRED_MSG),
  startDate: z.string({ required_error: REQUIRED_MSG }).min(1, REQUIRED_MSG),
  endDate: z.string({ required_error: REQUIRED_MSG }).min(1, REQUIRED_MSG),
  reason: z.string().optional(),
});

export const reviewLeaveRequestSchema = z.object({
  note: z.string().optional(),
});
