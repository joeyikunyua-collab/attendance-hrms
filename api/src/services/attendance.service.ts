import { attendanceRepository } from "../repositories/attendance.repository";
import { employeeRepository } from "../repositories/employee.repository";
import { notificationRepository } from "../repositories/notification.repository";
import { notificationService } from "./notification.service";
import { todayStr, isWeekend, checkInReminderSlot } from "../utils/dates";
import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../types";

/** Staff can only ever act on/see their own attendance; admins act globally.
 * Returns the caller's own employee id (staff) or null (admin). */
async function resolveOwnEmployeeId(user: AuthUser): Promise<string | null> {
  if (user.role === "admin") return null;
  const own = await employeeRepository.findByUserSelectId(user.id);
  if (!own) {
    throw new ApiError(403, "No employee record is linked to this account");
  }
  return String(own._id);
}

async function list(
  user: AuthUser,
  query: { date?: string; employeeId?: string; from?: string; to?: string; limit?: string; skip?: string }
) {
  const ownEmployeeId = await resolveOwnEmployeeId(user);
  const { date, employeeId, from, to, limit, skip } = query;
  const filter: Record<string, unknown> = {};

  if (typeof date === "string" && date) {
    filter.date = date;
  } else if (typeof from === "string" && typeof to === "string" && from && to) {
    filter.date = { $gte: from, $lte: to };
  }

  if (ownEmployeeId) {
    filter.employee = ownEmployeeId;
  } else if (typeof employeeId === "string" && employeeId) {
    filter.employee = employeeId;
  }

  const limitNum = typeof limit === "string" ? parseInt(limit, 10) : NaN;
  const skipNum = typeof skip === "string" ? parseInt(skip, 10) : NaN;
  const isPaginated = !Number.isNaN(limitNum);

  const [records, total] = await Promise.all([
    attendanceRepository.find(filter, {
      skip: Number.isNaN(skipNum) ? undefined : skipNum,
      limit: isPaginated ? limitNum : undefined,
    }),
    isPaginated ? attendanceRepository.count(filter) : Promise.resolve(undefined),
  ]);

  return { records, total };
}

async function checkIn(
  user: AuthUser,
  body: { date?: string; status?: string; latitude?: unknown; longitude?: unknown; accuracy?: unknown }
) {
  const ownEmployeeId = await resolveOwnEmployeeId(user);
  if (!ownEmployeeId) {
    throw new ApiError(403, "Admins cannot check employees in on their behalf");
  }

  const { date, status, latitude, longitude, accuracy } = body;
  if (!date) {
    throw new ApiError(400, "employeeId and date are required");
  }

  let record;
  try {
    record = await attendanceRepository.create({
      employee: ownEmployeeId as never,
      date,
      checkIn: new Date(),
      checkInLatitude: typeof latitude === "number" ? latitude : null,
      checkInLongitude: typeof longitude === "number" ? longitude : null,
      checkInAccuracy: typeof accuracy === "number" ? accuracy : null,
      status: (status as never) ?? "present",
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      throw new ApiError(409, "This employee is already checked in for that date");
    }
    throw new ApiError(500, "Failed to record check-in");
  }

  const populated = await record.populate("employee");

  const checkInTime = new Date(record.checkIn as Date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  await notificationService.notifyAdmins(
    {
      type: "checked_in",
      title: "Employee checked in",
      body: `${user.name} checked in at ${checkInTime}.`,
    },
    user.id
  );
  await notificationService.notifyUser(user.id, {
    type: "checked_in",
    title: "Checked in",
    body: `You checked in at ${checkInTime}.`,
  });

  return populated;
}

function assertOwnsOrAdmin(record: { employee: unknown }, user: AuthUser) {
  if (user.role !== "admin") {
    const employee = record.employee as unknown as { user?: { toString(): string } } | null;
    const ownsRecord =
      employee && "user" in employee && employee.user && employee.user.toString() === user.id;
    if (!ownsRecord) {
      throw new ApiError(403, "You can only update your own attendance");
    }
  }
}

async function checkOut(
  user: AuthUser,
  id: string,
  body: { action?: string; latitude?: unknown; longitude?: unknown; accuracy?: unknown }
) {
  const record = await attendanceRepository.findById(id);
  if (!record) throw new ApiError(404, "Attendance record not found");

  assertOwnsOrAdmin(record, user);

  if (user.role === "admin") {
    throw new ApiError(403, "Admins cannot check employees out on their behalf");
  }

  const { action, latitude, longitude, accuracy } = body;
  if (action !== "checkout") {
    throw new ApiError(403, "You can only check yourself out");
  }

  record.checkOut = new Date();
  record.checkOutLatitude = typeof latitude === "number" ? latitude : null;
  record.checkOutLongitude = typeof longitude === "number" ? longitude : null;
  record.checkOutAccuracy = typeof accuracy === "number" ? accuracy : null;
  await record.save();

  const checkOutTime = record.checkOut.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  await notificationService.notifyAdmins(
    {
      type: "checked_out",
      title: "Employee checked out",
      body: `${user.name} checked out at ${checkOutTime}.`,
    },
    user.id
  );
  await notificationService.notifyUser(user.id, {
    type: "checked_out",
    title: "Checked out",
    body: `You checked out at ${checkOutTime}.`,
  });

  return record;
}

async function remove(user: AuthUser, id: string) {
  const record = await attendanceRepository.findById(id);
  if (!record) throw new ApiError(404, "Attendance record not found");

  assertOwnsOrAdmin(record, user);
  if (user.role !== "admin") {
    throw new ApiError(403, "Admins only");
  }

  await attendanceRepository.findByIdAndDelete(id);
}

async function checkinReminder(user: AuthUser) {
  const employee = await employeeRepository.findByUserSelectId(user.id);
  if (!employee) return { created: false }; // admins / unlinked accounts: quiet no-op

  const today = todayStr();
  if (isWeekend(today)) return { created: false };

  const slot = checkInReminderSlot(new Date());
  if (!slot) return { created: false }; // outside 9:00-12:00

  const attendance = await attendanceRepository.findOneByEmployeeAndDate(employee._id, today);
  if (attendance?.checkIn) return { created: false }; // already checked in

  const dedupeKey = `checkin_reminder:${today}:${slot}`;
  const exists = await notificationRepository.findByRecipientAndDedupeKey(user.id, dedupeKey);
  if (exists) return { created: false };

  await notificationRepository.create({
    recipient: user.id as never,
    type: "checkin_reminder",
    title: "Check-in reminder",
    body: "You haven't checked in yet today — don't forget to check in.",
    dedupeKey,
  });

  return { created: true };
}

export const attendanceService = {
  list,
  checkIn,
  checkOut,
  remove,
  checkinReminder,
};
