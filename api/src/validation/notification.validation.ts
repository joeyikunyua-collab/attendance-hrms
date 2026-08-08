import { z } from "zod";

export const sendWishSchema = z.object({
  message: z.string({ required_error: "A message is required" }).min(1, "A message is required"),
});
