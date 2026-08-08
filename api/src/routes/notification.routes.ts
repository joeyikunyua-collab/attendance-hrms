import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { requireUser, requireAdmin } from "../middleware/auth.middleware";
import { validate } from "../validation/validate";
import { sendWishSchema } from "../validation/notification.validation";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/mark-read", requireUser, asyncHandler(notificationController.markRead));
router.get("/unread-count", requireUser, asyncHandler(notificationController.unreadCount));
router.post("/nudge/:employeeId", requireAdmin, asyncHandler(notificationController.nudge));
router.post(
  "/wish/:employeeId",
  requireUser,
  validate(sendWishSchema),
  asyncHandler(notificationController.sendWish)
);
router.get("/", requireUser, asyncHandler(notificationController.list));

export default router;
