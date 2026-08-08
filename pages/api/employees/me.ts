import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser } from "@/lib/apiAuth";
import Employee from "@/models/Employee";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  await connectToDatabase();

  const employee = await Employee.findOne({ user: user.id }).lean();
  if (!employee) {
    return res.status(404).json({ message: "No employee record is linked to this account" });
  }

  return res.status(200).json({ employee });
}
