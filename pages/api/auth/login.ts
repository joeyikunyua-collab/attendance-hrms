import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Employee from "@/models/Employee";
import LoginEvent from "@/models/LoginEvent";
import { verifyPassword, signAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import type { AuthUser } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  await connectToDatabase();

  const user = await User.findOne({ username: String(username).toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  if (user.employee) {
    const employee = await Employee.findById(user.employee).select("active").lean<{
      active: boolean;
    } | null>();
    if (employee && !employee.active) {
      return res.status(401).json({ message: "This account has been deactivated." });
    }
  }

  const authUser: AuthUser = {
    id: user._id.toString(),
    username: user.username,
    name: user.name,
    role: user.role,
  };

  const token = await signAuthToken(authUser, user.tokenVersion ?? 0);

  res.setHeader(
    "Set-Cookie",
    serialize(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    })
  );

  const loginEvent = await LoginEvent.create({
    user: user._id,
    username: authUser.username,
    name: authUser.name,
    role: authUser.role,
  });

  return res.status(200).json({
    user: { ...authUser, mustChangePassword: user.mustChangePassword ?? false },
    loginEventId: loginEvent._id.toString(),
  });
}
