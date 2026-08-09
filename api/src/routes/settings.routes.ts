import { Router } from "express";
import { settingsController } from "../controllers/settings.controller";
import { requireUser, requireAdmin } from "../middleware/auth.middleware";
import { validate } from "../validation/validate";
import { updateSettingsSchema } from "../validation/settings.validation";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// No auth - the login page needs branding before anyone's signed in.
router.get("/public", asyncHandler(settingsController.getPublic));
router.get("/", requireUser, asyncHandler(settingsController.get));
router.put("/", requireAdmin, validate(updateSettingsSchema), asyncHandler(settingsController.update));

export default router;
