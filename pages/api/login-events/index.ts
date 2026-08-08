import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import LoginEvent from "@/models/LoginEvent";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  await connectToDatabase();

  const events = await LoginEvent.find().sort({ loggedInAt: -1 }).limit(200).lean();
  return res.status(200).json({ events });
}
