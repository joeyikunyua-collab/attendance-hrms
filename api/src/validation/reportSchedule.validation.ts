import { z } from "zod";

export const createReportScheduleSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly"], {
    required_error: "frequency is required",
  }),
  format: z.enum(["csv", "pdf"], { required_error: "format is required" }),
  recipients: z
    .array(z.string().email("Each recipient must be a valid email address"))
    .min(1, "At least one recipient email is required"),
});
