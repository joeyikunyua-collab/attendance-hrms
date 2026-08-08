import { Router } from "express";
import authRoutes from "./auth.routes";
import attendanceRoutes from "./attendance.routes";
import employeeRoutes from "./employee.routes";
import loginEventRoutes from "./loginEvent.routes";
import notificationRoutes from "./notification.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/employees", employeeRoutes);
router.use("/login-events", loginEventRoutes);
router.use("/notifications", notificationRoutes);

export default router;
