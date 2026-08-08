import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireUser } from "../middleware/auth.middleware";
import { validate } from "../validation/validate";
import { loginSchema, setPasswordSchema, loginLocationSchema } from "../validation/auth.validation";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/login", validate(loginSchema), asyncHandler(authController.login));
router.post("/logout", asyncHandler(authController.logout));
router.get("/me", requireUser, asyncHandler(authController.me));
router.post(
  "/set-password",
  requireUser,
  validate(setPasswordSchema),
  asyncHandler(authController.setPassword)
);
router.post(
  "/login-location",
  requireUser,
  validate(loginLocationSchema),
  asyncHandler(authController.recordLoginLocation)
);

export default router;
