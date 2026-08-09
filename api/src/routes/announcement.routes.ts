import { Router } from "express";
import { announcementController } from "../controllers/announcement.controller";
import { requireUser, requireAdmin } from "../middleware/auth.middleware";
import { validate } from "../validation/validate";
import { createAnnouncementSchema } from "../validation/announcement.validation";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", requireUser, asyncHandler(announcementController.list));
router.post(
  "/",
  requireAdmin,
  validate(createAnnouncementSchema),
  asyncHandler(announcementController.create)
);
router.post("/:id/acknowledge", requireUser, asyncHandler(announcementController.acknowledge));
router.delete("/:id", requireAdmin, asyncHandler(announcementController.remove));

export default router;
