import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser } from "@/lib/apiAuth";
import Notification from "@/models/Notification";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  await connectToDatabase();

  const count = await Notification.countDocuments({ recipient: user.id, read: false });

  return res.status(200).json({ count });
}
