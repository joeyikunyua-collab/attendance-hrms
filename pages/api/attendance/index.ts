import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser } from "@/lib/apiAuth";
import Attendance from "@/models/Attendance";
import Employee from "@/models/Employee";
import { notifyAdmins, notifyUser } from "@/lib/notify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  await connectToDatabase();

  let ownEmployeeId: string | null = null;
  if (user.role !== "admin") {
    const own = await Employee.findOne({ user: user.id }).lean<{ _id: unknown } | null>();
    if (!own) {
      return res.status(403).json({ message: "No employee record is linked to this account" });
    }
    ownEmployeeId = String(own._id);
  }

  if (req.method === "GET") {
    const { date, employeeId, from, to, limit, skip } = req.query;
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

    // limit/skip are opt-in - callers that need the whole range at once (the
    // Time at Work matrix, the calendars) omit them and get everything, as
    // before. Only paginated callers (Reports) pay for the extra count query.
    const limitNum = typeof limit === "string" ? parseInt(limit, 10) : NaN;
    const skipNum = typeof skip === "string" ? parseInt(skip, 10) : NaN;
    const isPaginated = !Number.isNaN(limitNum);

    let query = Attendance.find(filter).populate("employee").sort({ date: -1, createdAt: -1 });
    if (!Number.isNaN(skipNum)) query = query.skip(skipNum);
    if (isPaginated) query = query.limit(limitNum);

    const [records, total] = await Promise.all([
      query.lean(),
      isPaginated ? Attendance.countDocuments(filter) : Promise.resolve(undefined),
    ]);

    return res.status(200).json({ records, total });
  }

  if (req.method === "POST") {
    if (!ownEmployeeId) {
      return res.status(403).json({ message: "Admins cannot check employees in on their behalf" });
    }

    const { date, status, latitude, longitude, accuracy } = req.body ?? {};
    const employeeId = ownEmployeeId;
    if (!employeeId || !date) {
      return res.status(400).json({ message: "employeeId and date are required" });
    }

    try {
      const record = await Attendance.create({
        employee: employeeId,
        date,
        checkIn: new Date(),
        checkInLatitude: typeof latitude === "number" ? latitude : null,
        checkInLongitude: typeof longitude === "number" ? longitude : null,
        checkInAccuracy: typeof accuracy === "number" ? accuracy : null,
        status: status ?? "present",
      });
      const populated = await record.populate("employee");

      const checkInTime = new Date(record.checkIn).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      await notifyAdmins(
        {
          type: "checked_in",
          title: "Employee checked in",
          body: `${user.name} checked in at ${checkInTime}.`,
        },
        user.id
      );
      await notifyUser(user.id, {
        type: "checked_in",
        title: "Checked in",
        body: `You checked in at ${checkInTime}.`,
      });

      return res.status(201).json({ record: populated });
    } catch (err: any) {
      if (err?.code === 11000) {
        return res.status(409).json({ message: "This employee is already checked in for that date" });
      }
      return res.status(500).json({ message: "Failed to record check-in" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
