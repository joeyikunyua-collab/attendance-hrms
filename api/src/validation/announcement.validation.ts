import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string({ required_error: "Title and body are required" }).min(1, "Title and body are required"),
  body: z.string({ required_error: "Title and body are required" }).min(1, "Title and body are required"),
  // Not a static enum - checked against the admin-configured category list
  // at post time (see announcementService.create()).
  category: z.string().optional(),
  pinned: z.boolean().optional(),
});
