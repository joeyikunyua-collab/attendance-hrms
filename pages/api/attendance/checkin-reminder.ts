import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser } from "@/lib/apiAuth";
import { todayStr, isWeekend, checkInReminderSlot } from "@/lib/dates";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import Notification from "@/models/Notification";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  await connectToDatabase();

  const employee = await Employee.findOne({ user: user.id })
    .select("_id")
    .lean<{ _id: unknown } | null>();
  if (!employee) return res.status(200).json({ created: false }); // admins / unlinked accounts: quiet no-op

  const today = todayStr();
  if (isWeekend(today)) return res.status(200).json({ created: false });

  const slot = checkInReminderSlot(new Date());
  if (!slot) return res.status(200).json({ created: false }); // outside 9:00-12:00

  const attendance = await Attendance.findOne({ employee: employee._id, date: today })
    .select("checkIn")
    .lean<{ checkIn: Date | null } | null>();
  if (attendance?.checkIn) return res.status(200).json({ created: false }); // already checked in

  const dedupeKey = `checkin_reminder:${today}:${slot}`;
  const exists = await Notification.findOne({ recipient: user.id, dedupeKey }).select("_id").lean();
  if (exists) return res.status(200).json({ created: false });

  await Notification.create({
    recipient: user.id,
    type: "checkin_reminder",
    title: "Check-in reminder",
    body: "You haven't checked in yet today — don't forget to check in.",
    dedupeKey,
  });

  return res.status(201).json({ created: true });
}
