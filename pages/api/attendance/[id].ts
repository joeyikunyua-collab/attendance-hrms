import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser } from "@/lib/apiAuth";
import Attendance from "@/models/Attendance";
import "@/models/Employee";
import { notifyAdmins, notifyUser } from "@/lib/notify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid attendance id" });
  }

  await connectToDatabase();

  const record = await Attendance.findById(id).populate("employee");
  if (!record) return res.status(404).json({ message: "Attendance record not found" });

  if (user.role !== "admin") {
    const employee = record.employee as unknown as { user?: { toString(): string } } | null;
    const ownsRecord =
      employee && "user" in employee && employee.user && employee.user.toString() === user.id;
    if (!ownsRecord) {
      return res.status(403).json({ message: "You can only update your own attendance" });
    }
  }

  if (req.method === "PUT") {
    if (user.role === "admin") {
      return res.status(403).json({ message: "Admins cannot check employees out on their behalf" });
    }

    const { action, latitude, longitude, accuracy } = req.body ?? {};
    if (action !== "checkout") {
      return res.status(403).json({ message: "You can only check yourself out" });
    }

    record.checkOut = new Date();
    record.checkOutLatitude = typeof latitude === "number" ? latitude : null;
    record.checkOutLongitude = typeof longitude === "number" ? longitude : null;
    record.checkOutAccuracy = typeof accuracy === "number" ? accuracy : null;
    await record.save();

    const checkOutTime = record.checkOut.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    await notifyAdmins(
      {
        type: "checked_out",
        title: "Employee checked out",
        body: `${user.name} checked out at ${checkOutTime}.`,
      },
      user.id
    );
    await notifyUser(user.id, {
      type: "checked_out",
      title: "Checked out",
      body: `You checked out at ${checkOutTime}.`,
    });

    return res.status(200).json({ record });
  }

  if (req.method === "DELETE") {
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }
    await Attendance.findByIdAndDelete(id);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
