import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser } from "@/lib/apiAuth";
import LoginEvent from "@/models/LoginEvent";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { loginEventId, latitude, longitude, accuracy, error } = req.body ?? {};
  if (!loginEventId) {
    return res.status(400).json({ message: "loginEventId is required" });
  }

  await connectToDatabase();

  const event = await LoginEvent.findById(loginEventId);
  if (!event || event.user.toString() !== user.id) {
    return res.status(404).json({ message: "Login event not found" });
  }

  if (typeof latitude === "number" && typeof longitude === "number") {
    event.latitude = latitude;
    event.longitude = longitude;
    event.accuracy = typeof accuracy === "number" ? accuracy : null;
  } else if (typeof error === "string") {
    event.locationError = error;
  }

  await event.save();
  return res.status(200).json({ ok: true });
}
