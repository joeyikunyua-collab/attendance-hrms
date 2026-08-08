import { userRepository } from "../repositories/user.repository";
import { employeeRepository } from "../repositories/employee.repository";
import { loginEventRepository } from "../repositories/loginEvent.repository";
import { notificationService } from "./notification.service";
import { hashPassword, verifyPassword, DEFAULT_EMPLOYEE_PASSWORD } from "../utils/password";
import { signAuthToken } from "../utils/token";
import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../types";

async function login(username: string, password: string) {
  const user = await userRepository.findByUsername(String(username).toLowerCase().trim());
  if (!user) {
    throw new ApiError(401, "Invalid username or password");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid username or password");
  }

  if (user.employee) {
    const employee = await employeeRepository.findByIdSelectActive(String(user.employee));
    if (employee && !employee.active) {
      throw new ApiError(401, "This account has been deactivated.");
    }
  }

  const authUser: AuthUser = {
    id: user._id.toString(),
    username: user.username,
    name: user.name,
    role: user.role,
  };

  const token = await signAuthToken(authUser, user.tokenVersion ?? 0);

  const loginEvent = await loginEventRepository.create({
    user: user._id,
    username: authUser.username,
    name: authUser.name,
    role: authUser.role,
  } as never);

  return {
    token,
    user: { ...authUser, mustChangePassword: user.mustChangePassword ?? false },
    loginEventId: loginEvent._id.toString(),
  };
}

async function setPassword(user: AuthUser, newPassword: string) {
  if (typeof newPassword !== "string" || newPassword.length === 0) {
    throw new ApiError(400, "New password is required");
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }
  if (newPassword === DEFAULT_EMPLOYEE_PASSWORD) {
    throw new ApiError(400, "Please choose a password other than the default one.");
  }

  const passwordHash = await hashPassword(newPassword);
  await userRepository.findByIdAndUpdate(user.id, {
    passwordHash,
    mustChangePassword: false,
  });

  if (user.mustChangePassword) {
    await notificationService.notifyAdmins({
      type: "password_changed",
      title: "Employee completed account setup",
      body: `${user.name} set their own password and is ready to use the system.`,
    });
  }
}

async function recordLoginLocation(
  userId: string,
  loginEventId: string,
  data: { latitude?: unknown; longitude?: unknown; accuracy?: unknown; error?: unknown }
) {
  const event = await loginEventRepository.findById(loginEventId);
  if (!event || event.user.toString() !== userId) {
    throw new ApiError(404, "Login event not found");
  }

  const { latitude, longitude, accuracy, error } = data;
  if (typeof latitude === "number" && typeof longitude === "number") {
    event.latitude = latitude;
    event.longitude = longitude;
    event.accuracy = typeof accuracy === "number" ? accuracy : null;
  } else if (typeof error === "string") {
    event.locationError = error;
  }

  await event.save();
}

export const authService = {
  login,
  setPassword,
  recordLoginLocation,
};
