import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { hashPassword, DEFAULT_EMPLOYEE_PASSWORD } from "@/lib/auth";
import Employee from "@/models/Employee";
import User from "@/models/User";
import Counter from "@/models/Counter";
import { notifyAdmins } from "@/lib/notify";

/**
 * Atomically increments a shared counter to get the next employeeId, and
 * self-heals it against whatever the highest employeeId in the Employee
 * collection actually is - so a counter that starts behind (e.g. never
 * initialized, or employees were seeded/imported outside this endpoint)
 * can't hand out an ID that collides with an existing employee. Using a
 * single atomic update (rather than "read max, then create") avoids the
 * race/staleness that caused duplicate-key failures under the old approach.
 */
async function generateEmployeeId(): Promise<string> {
  // Compute the floor numerically in JS rather than via `.sort({employeeId: -1})`:
  // a Mongo string sort compares "EMP001" > "EMP0005" lexicographically (since
  // '1' > '0' at the same character position), so any legacy/non-zero-padded
  // employeeId would make the DB-side sort pick the wrong "last" record.
  const allIds = await Employee.find({ employeeId: /^EMP\d+$/ })
    .select("employeeId")
    .lean<{ employeeId: string }[]>();
  const floor = allIds.reduce((max, e) => {
    const n = parseInt(e.employeeId.slice(3), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);

  const counter = await Counter.findOneAndUpdate(
    { _id: "employeeId" },
    [{ $set: { seq: { $add: [{ $max: [{ $ifNull: ["$seq", 0] }, floor] }, 1] } } }],
    { new: true, upsert: true }
  );

  return `EMP${String(counter.seq).padStart(4, "0")}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  await connectToDatabase();

  if (req.method === "GET") {
    const employees = await Employee.find().sort({ name: 1 }).lean();
    return res.status(200).json({ employees });
  }

  if (req.method === "POST") {
    const { firstName, middleName, lastName, workEmail, department, designation, role } =
      req.body ?? {};

    if (!firstName || !lastName || !workEmail) {
      return res
        .status(400)
        .json({ message: "First name, last name and work email are required" });
    }

    const normalizedRole = role === "admin" ? "admin" : "staff";
    const normalizedEmail = String(workEmail).trim().toLowerCase();
    const name = [firstName, middleName, lastName]
      .map((part) => (part ? String(part).trim() : ""))
      .filter(Boolean)
      .join(" ");

    const existingUser = await User.findOne({ username: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "A login already exists for that work email" });
    }

    // Belt-and-braces: User.username and Employee.workEmail are supposed to
    // always be created/deleted together, but check the Employee side too
    // in case they've ever drifted (e.g. a partially-failed prior attempt).
    const existingEmployee = await Employee.findOne({ workEmail: normalizedEmail }).select("_id").lean();
    if (existingEmployee) {
      return res.status(409).json({ message: "An employee with that work email already exists" });
    }

    const passwordHash = await hashPassword(DEFAULT_EMPLOYEE_PASSWORD);

    let loginUser;
    try {
      loginUser = await User.create({
        username: normalizedEmail,
        passwordHash,
        name,
        role: normalizedRole,
        mustChangePassword: true,
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        return res.status(409).json({ message: "A login already exists for that work email" });
      }
      return res.status(500).json({ message: "Failed to create employee login" });
    }

    let employee;
    try {
      // Retry if two admins create employees at the same instant and both
      // compute the same "next" employeeId, or if generateEmployeeId's
      // max-lookup is ever out of date for any other reason. Only a
      // workEmail conflict (the one other unique field on Employee) is
      // treated as non-retriable, since retrying can't fix that one.
      for (let attempt = 0; ; attempt++) {
        try {
          const employeeId = await generateEmployeeId();
          employee = await Employee.create({
            employeeId,
            firstName: String(firstName).trim(),
            middleName: middleName ? String(middleName).trim() : "",
            lastName: String(lastName).trim(),
            name,
            workEmail: normalizedEmail,
            department: department ? String(department).trim() : "",
            designation: designation ? String(designation).trim() : "",
            role: normalizedRole,
            user: loginUser._id,
          });
          break;
        } catch (err: any) {
          const conflictField = Object.keys(err?.keyPattern ?? err?.keyValue ?? {})[0];
          const isRetriableConflict = err?.code === 11000 && conflictField !== "workEmail";
          if (isRetriableConflict && attempt < 4) continue;
          throw err;
        }
      }
    } catch (err: any) {
      await User.findByIdAndDelete(loginUser._id);
      if (err?.code === 11000) {
        const conflictField = Object.keys(err?.keyPattern ?? err?.keyValue ?? {})[0];
        if (conflictField === "workEmail") {
          return res.status(409).json({ message: "An employee with that work email already exists" });
        }
        return res.status(409).json({
          message: `Could not generate a unique employee ID after several attempts (conflict on: ${
            conflictField ?? "unknown field"
          }). Please try again.`,
        });
      }
      return res.status(500).json({ message: "Failed to create employee" });
    }

    loginUser.employee = employee._id;
    await loginUser.save();

    await notifyAdmins(
      {
        type: "employee_created",
        title: "New employee added",
        body: `${name} was added as ${normalizedRole}${department ? ` in ${department}` : ""}.`,
      },
      user.id
    );

    return res.status(201).json({
      employee,
      credentials: { username: normalizedEmail, temporaryPassword: DEFAULT_EMPLOYEE_PASSWORD },
    });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
