import { Router } from "express";
import { loginEventController } from "../controllers/loginEvent.controller";
import { requireAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", requireAdmin, asyncHandler(loginEventController.list));

export default router;
