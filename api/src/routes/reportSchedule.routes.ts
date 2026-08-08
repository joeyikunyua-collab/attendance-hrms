import { Router } from "express";
import { reportScheduleController } from "../controllers/reportSchedule.controller";
import { requireAdmin } from "../middleware/auth.middleware";
import { validate } from "../validation/validate";
import { createReportScheduleSchema } from "../validation/reportSchedule.validation";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", requireAdmin, asyncHandler(reportScheduleController.list));
router.post(
  "/",
  requireAdmin,
  validate(createReportScheduleSchema),
  asyncHandler(reportScheduleController.create)
);
router.delete("/:id", requireAdmin, asyncHandler(reportScheduleController.remove));

export default router;
