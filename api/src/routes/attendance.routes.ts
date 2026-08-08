import { Router } from "express";
import { attendanceController } from "../controllers/attendance.controller";
import { requireUser, requireAdmin } from "../middleware/auth.middleware";
import { validate } from "../validation/validate";
import {
  checkInSchema,
  checkOutSchema,
  manualEntrySchema,
  resolveExceptionSchema,
} from "../validation/attendance.validation";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/checkin-reminder", requireUser, asyncHandler(attendanceController.checkinReminder));
router.post(
  "/manual",
  requireAdmin,
  validate(manualEntrySchema),
  asyncHandler(attendanceController.manualUpsert)
);
router.get("/", requireUser, asyncHandler(attendanceController.list));
router.post("/", requireUser, validate(checkInSchema), asyncHandler(attendanceController.checkIn));
router.put(
  "/:id",
  requireUser,
  validate(checkOutSchema),
  asyncHandler(attendanceController.checkOut)
);
router.delete("/:id", requireUser, asyncHandler(attendanceController.remove));
router.post(
  "/:id/resolve",
  requireAdmin,
  validate(resolveExceptionSchema),
  asyncHandler(attendanceController.resolveException)
);

export default router;
