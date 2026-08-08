import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { requireUser } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/mark-read", requireUser, asyncHandler(notificationController.markRead));
router.get("/unread-count", requireUser, asyncHandler(notificationController.unreadCount));
router.get("/", requireUser, asyncHandler(notificationController.list));

export default router;
