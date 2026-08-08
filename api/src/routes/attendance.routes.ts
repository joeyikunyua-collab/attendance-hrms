import { Router } from "express";
import { attendanceController } from "../controllers/attendance.controller";
import { requireUser } from "../middleware/auth.middleware";
import { validate } from "../validation/validate";
import { checkInSchema, checkOutSchema } from "../validation/attendance.validation";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/checkin-reminder", requireUser, asyncHandler(attendanceController.checkinReminder));
router.get("/", requireUser, asyncHandler(attendanceController.list));
router.post("/", requireUser, validate(checkInSchema), asyncHandler(attendanceController.checkIn));
router.put(
  "/:id",
  requireUser,
  validate(checkOutSchema),
  asyncHandler(attendanceController.checkOut)
);
router.delete("/:id", requireUser, asyncHandler(attendanceController.remove));

export default router;
