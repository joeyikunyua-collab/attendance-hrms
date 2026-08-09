import { Router } from "express";
import { leaveRequestController } from "../controllers/leaveRequest.controller";
import { requireUser, requireAdmin } from "../middleware/auth.middleware";
import { validate } from "../validation/validate";
import { createLeaveRequestSchema, reviewLeaveRequestSchema } from "../validation/leaveRequest.validation";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Declared before "/:id" so the literal path segments aren't swallowed by the param route.
router.get("/mine", requireUser, asyncHandler(leaveRequestController.listMine));
router.get("/for-review", requireUser, asyncHandler(leaveRequestController.listForReview));
router.get("/balance", requireUser, asyncHandler(leaveRequestController.balance));
router.get("/", requireAdmin, asyncHandler(leaveRequestController.listAll));
router.post("/", requireUser, validate(createLeaveRequestSchema), asyncHandler(leaveRequestController.create));
// Not admin-gated: a request's own approvalStage decides whether the caller
// (admin, or the employee's direct manager) is actually allowed to act on
// it - see leaveRequestService.review().
router.post(
  "/:id/approve",
  requireUser,
  validate(reviewLeaveRequestSchema),
  asyncHandler(leaveRequestController.approve)
);
router.post(
  "/:id/reject",
  requireUser,
  validate(reviewLeaveRequestSchema),
  asyncHandler(leaveRequestController.reject)
);
router.post("/:id/cancel", requireUser, asyncHandler(leaveRequestController.cancel));

export default router;
