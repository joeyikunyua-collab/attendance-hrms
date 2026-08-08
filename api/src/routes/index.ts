import { Router } from "express";
import authRoutes from "./auth.routes";
import attendanceRoutes from "./attendance.routes";
import employeeRoutes from "./employee.routes";
import loginEventRoutes from "./loginEvent.routes";
import notificationRoutes from "./notification.routes";
import reportScheduleRoutes from "./reportSchedule.routes";
import announcementRoutes from "./announcement.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/employees", employeeRoutes);
router.use("/login-events", loginEventRoutes);
router.use("/notifications", notificationRoutes);
router.use("/report-schedules", reportScheduleRoutes);
router.use("/announcements", announcementRoutes);

export default router;
