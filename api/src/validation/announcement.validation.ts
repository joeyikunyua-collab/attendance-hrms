import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string({ required_error: "Title and body are required" }).min(1, "Title and body are required"),
  body: z.string({ required_error: "Title and body are required" }).min(1, "Title and body are required"),
  category: z.enum(["company_update", "policy", "event"]).optional(),
  pinned: z.boolean().optional(),
});
