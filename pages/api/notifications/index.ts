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

  const { limit, skip } = req.query;
  const limitNum = typeof limit === "string" ? parseInt(limit, 10) : NaN;
  const skipNum = typeof skip === "string" ? parseInt(skip, 10) : NaN;
  const isPaginated = !Number.isNaN(limitNum);

  let query = Notification.find({ recipient: user.id }).sort({ createdAt: -1 });
  if (!Number.isNaN(skipNum)) query = query.skip(skipNum);
  if (isPaginated) query = query.limit(limitNum);

  const [notifications, total] = await Promise.all([
    query.lean(),
    isPaginated ? Notification.countDocuments({ recipient: user.id }) : Promise.resolve(undefined),
  ]);

  return res.status(200).json({ notifications, total });
}
