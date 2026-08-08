import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser } from "@/lib/apiAuth";
import { hashPassword, DEFAULT_EMPLOYEE_PASSWORD } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notify";
import User from "@/models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { newPassword } = req.body ?? {};

  if (typeof newPassword !== "string" || newPassword.length === 0) {
    return res.status(400).json({ message: "New password is required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  if (newPassword === DEFAULT_EMPLOYEE_PASSWORD) {
    return res.status(400).json({ message: "Please choose a password other than the default one." });
  }

  await connectToDatabase();

  const passwordHash = await hashPassword(newPassword);
  await User.findByIdAndUpdate(user.id, {
    passwordHash,
    mustChangePassword: false,
  });

  if (user.mustChangePassword) {
    await notifyAdmins({
      type: "password_changed",
      title: "Employee completed account setup",
      body: `${user.name} set their own password and is ready to use the system.`,
    });
  }

  return res.status(200).json({ ok: true });
}
