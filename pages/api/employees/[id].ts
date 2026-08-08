import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import Employee from "@/models/Employee";
import User from "@/models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid employee id" });
  }

  await connectToDatabase();

  if (req.method === "PUT") {
    const { firstName, middleName, lastName, department, designation, role, active } =
      req.body ?? {};

    const existing = await Employee.findById(id);
    if (!existing) return res.status(404).json({ message: "Employee not found" });

    const wasActive = existing.active;

    if (firstName !== undefined) existing.firstName = String(firstName).trim();
    if (middleName !== undefined) existing.middleName = String(middleName).trim();
    if (lastName !== undefined) existing.lastName = String(lastName).trim();
    if (department !== undefined) existing.department = String(department).trim();
    if (designation !== undefined) existing.designation = String(designation).trim();
    if (role !== undefined) existing.role = role === "admin" ? "admin" : "staff";
    if (active !== undefined) existing.active = Boolean(active);

    if (firstName !== undefined || middleName !== undefined || lastName !== undefined) {
      existing.name = [existing.firstName, existing.middleName, existing.lastName]
        .filter(Boolean)
        .join(" ");
    }

    await existing.save();

    if (existing.user && (role !== undefined || firstName !== undefined || middleName !== undefined || lastName !== undefined)) {
      await User.findByIdAndUpdate(existing.user, {
        ...(role !== undefined ? { role: existing.role } : {}),
        name: existing.name,
      });
    }

    // Revoke any session already issued to this account the moment they're deactivated.
    if (existing.user && wasActive && !existing.active) {
      await User.findByIdAndUpdate(existing.user, { $inc: { tokenVersion: 1 } });
    }

    return res.status(200).json({ employee: existing });
  }

  if (req.method === "DELETE") {
    const employee = await Employee.findByIdAndDelete(id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    if (employee.user) {
      await User.findByIdAndDelete(employee.user);
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
