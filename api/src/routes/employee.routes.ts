import { Router } from "express";
import { employeeController } from "../controllers/employee.controller";
import { requireUser, requireAdmin } from "../middleware/auth.middleware";
import { validate } from "../validation/validate";
import { createEmployeeSchema, updateEmployeeSchema } from "../validation/employee.validation";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Declared before "/:id" so literal paths aren't swallowed by the param route.
router.get("/me", requireUser, asyncHandler(employeeController.me));
router.get("/celebrations", requireUser, asyncHandler(employeeController.celebrations));
router.get("/", requireAdmin, asyncHandler(employeeController.list));
router.post(
  "/",
  requireAdmin,
  validate(createEmployeeSchema),
  asyncHandler(employeeController.create)
);
router.put(
  "/:id",
  requireAdmin,
  validate(updateEmployeeSchema),
  asyncHandler(employeeController.update)
);
router.delete("/:id", requireAdmin, asyncHandler(employeeController.remove));

export default router;
