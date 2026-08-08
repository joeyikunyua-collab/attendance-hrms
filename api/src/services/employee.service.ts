import { employeeRepository } from "../repositories/employee.repository";
import { userRepository } from "../repositories/user.repository";
import { counterRepository } from "../repositories/counter.repository";
import { notificationService } from "./notification.service";
import { hashPassword, DEFAULT_EMPLOYEE_PASSWORD } from "../utils/password";
import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../types";

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
  const allIds = await employeeRepository.findIdsMatchingPrefix();
  const floor = allIds.reduce((max, e) => {
    const n = parseInt(e.employeeId.slice(3), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);

  const counter = await counterRepository.incrementAtLeast("employeeId", floor);
  return `EMP${String(counter.seq).padStart(4, "0")}`;
}

async function list() {
  return employeeRepository.findAllSorted();
}

async function me(userId: string) {
  const employee = await employeeRepository.findByUserLean(userId);
  if (!employee) {
    throw new ApiError(404, "No employee record is linked to this account");
  }
  return employee;
}

async function create(
  adminUser: AuthUser,
  body: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    workEmail?: string;
    department?: string;
    designation?: string;
    role?: string;
  }
) {
  const { firstName, middleName, lastName, workEmail, department, designation, role } = body;

  if (!firstName || !lastName || !workEmail) {
    throw new ApiError(400, "First name, last name and work email are required");
  }

  const normalizedRole = role === "admin" ? "admin" : "staff";
  const normalizedEmail = String(workEmail).trim().toLowerCase();
  const name = [firstName, middleName, lastName]
    .map((part) => (part ? String(part).trim() : ""))
    .filter(Boolean)
    .join(" ");

  const existingUser = await userRepository.findByUsername(normalizedEmail);
  if (existingUser) {
    throw new ApiError(409, "A login already exists for that work email");
  }

  // Belt-and-braces: User.username and Employee.workEmail are supposed to
  // always be created/deleted together, but check the Employee side too
  // in case they've ever drifted (e.g. a partially-failed prior attempt).
  const existingEmployee = await employeeRepository.findByWorkEmail(normalizedEmail);
  if (existingEmployee) {
    throw new ApiError(409, "An employee with that work email already exists");
  }

  const passwordHash = await hashPassword(DEFAULT_EMPLOYEE_PASSWORD);

  let loginUser;
  try {
    loginUser = await userRepository.create({
      username: normalizedEmail,
      passwordHash,
      name,
      role: normalizedRole,
      mustChangePassword: true,
    } as never);
  } catch (err: any) {
    if (err?.code === 11000) {
      throw new ApiError(409, "A login already exists for that work email");
    }
    throw new ApiError(500, "Failed to create employee login");
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
        employee = await employeeRepository.create({
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
        } as never);
        break;
      } catch (err: any) {
        const conflictField = Object.keys(err?.keyPattern ?? err?.keyValue ?? {})[0];
        const isRetriableConflict = err?.code === 11000 && conflictField !== "workEmail";
        if (isRetriableConflict && attempt < 4) continue;
        throw err;
      }
    }
  } catch (err: any) {
    await userRepository.findByIdAndDelete(loginUser._id.toString());
    if (err?.code === 11000) {
      const conflictField = Object.keys(err?.keyPattern ?? err?.keyValue ?? {})[0];
      if (conflictField === "workEmail") {
        throw new ApiError(409, "An employee with that work email already exists");
      }
      throw new ApiError(
        409,
        `Could not generate a unique employee ID after several attempts (conflict on: ${
          conflictField ?? "unknown field"
        }). Please try again.`
      );
    }
    throw new ApiError(500, "Failed to create employee");
  }

  loginUser.employee = employee._id;
  await loginUser.save();

  await notificationService.notifyAdmins(
    {
      type: "employee_created",
      title: "New employee added",
      body: `${name} was added as ${normalizedRole}${department ? ` in ${department}` : ""}.`,
    },
    adminUser.id
  );

  return {
    employee,
    credentials: { username: normalizedEmail, temporaryPassword: DEFAULT_EMPLOYEE_PASSWORD },
  };
}

async function update(
  id: string,
  body: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    department?: string;
    designation?: string;
    role?: string;
    active?: boolean;
  }
) {
  const { firstName, middleName, lastName, department, designation, role, active } = body;

  const existing = await employeeRepository.findById(id);
  if (!existing) throw new ApiError(404, "Employee not found");

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

  if (
    existing.user &&
    (role !== undefined || firstName !== undefined || middleName !== undefined || lastName !== undefined)
  ) {
    await userRepository.findByIdAndUpdate(existing.user.toString(), {
      ...(role !== undefined ? { role: existing.role } : {}),
      name: existing.name,
    });
  }

  // Revoke any session already issued to this account the moment they're deactivated.
  if (existing.user && wasActive && !existing.active) {
    await userRepository.incrementTokenVersion(existing.user.toString());
  }

  return existing;
}

async function remove(id: string) {
  const employee = await employeeRepository.findByIdAndDelete(id);
  if (!employee) throw new ApiError(404, "Employee not found");
  if (employee.user) {
    await userRepository.findByIdAndDelete(employee.user.toString());
  }
}

export const employeeService = {
  list,
  me,
  create,
  update,
  remove,
};
