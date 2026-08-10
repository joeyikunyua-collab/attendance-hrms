import { employeeRepository } from "../repositories/employee.repository";
import { userRepository } from "../repositories/user.repository";
import { counterRepository } from "../repositories/counter.repository";
import { settingsRepository } from "../repositories/settings.repository";
import { notificationService } from "./notification.service";
import { leaveRequestService } from "./leaveRequest.service";
import { hashPassword } from "../utils/password";
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

/**
 * Employee documents written before the status/hireDate/officeLocation/
 * manager/employmentType/photoUrl fields existed don't have them in the DB -
 * Mongoose's schema `default` only applies to newly-created documents, not
 * retroactively to old ones, and `.lean()` reads skip the hydration step
 * that would otherwise paper over that. Normalize here so every response
 * is well-formed regardless of when the record was created.
 */
/** Only enforced once an admin has actually configured a location list in
 * Settings - before that (e.g. a fresh install), free text is still
 * accepted so employee creation isn't blocked on a setup step nobody's
 * reached yet. */
async function assertValidOfficeLocation(officeLocation: string) {
  const { officeLocations } = await settingsRepository.getLean();
  if (officeLocations.length > 0 && !officeLocations.includes(officeLocation)) {
    throw new ApiError(400, "That office location isn't configured - add it in Settings first");
  }
}

/** Same "only enforce once configured" behavior as office locations. */
async function assertValidDepartment(department: string) {
  const { departments } = await settingsRepository.getLean();
  if (departments.length > 0 && !departments.includes(department)) {
    throw new ApiError(400, "That department isn't configured - add it in Settings first");
  }
}

/** Unlike office locations/departments, `employmentTypes` always ships with
 * a non-empty default list, so this is effectively always enforced. */
async function assertValidEmploymentType(employmentType: string) {
  const { employmentTypes } = await settingsRepository.getLean();
  if (employmentTypes.length > 0 && !employmentTypes.some((t) => t.key === employmentType)) {
    throw new ApiError(400, "That employment type isn't configured - add it in Settings first");
  }
}

/** Only the direct "can't be your own manager" case was checked before -
 * this also rejects a *chain* (A reports to B, B reports to A; or longer),
 * which the direct check alone can't catch since each individual update
 * looks fine in isolation. Walks up the proposed manager's own chain,
 * bounded so a pre-existing bad chain elsewhere in the data can't hang
 * this request. */
async function assertNoManagerCycle(employeeId: string, proposedManagerId: string) {
  let currentId: string | null = proposedManagerId;
  const seen = new Set<string>();
  for (let hops = 0; currentId && hops < 50; hops++) {
    if (currentId === employeeId) {
      throw new ApiError(400, "That would create a manager cycle - choose a different manager");
    }
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const record = await employeeRepository.findByIdSelectManager(currentId);
    currentId = record?.manager ? String(record.manager) : null;
  }
}

function normalize<T extends { active: boolean; status?: string }>(employee: T) {
  return {
    ...employee,
    status: employee.status ?? (employee.active ? "active" : "inactive"),
    dateOfBirth: (employee as { dateOfBirth?: unknown }).dateOfBirth ?? null,
    hireDate: (employee as { hireDate?: unknown }).hireDate ?? null,
    officeLocation: (employee as { officeLocation?: unknown }).officeLocation ?? "",
    manager: (employee as { manager?: unknown }).manager ?? null,
    employmentType: (employee as { employmentType?: unknown }).employmentType ?? "full_time",
    photoUrl: (employee as { photoUrl?: unknown }).photoUrl ?? null,
  };
}

async function list() {
  const employees = await employeeRepository.findAllSorted();
  return employees.map(normalize);
}

async function me(userId: string) {
  const employee = await employeeRepository.findByUserLean(userId);
  if (!employee) {
    throw new ApiError(404, "No employee record is linked to this account");
  }
  return normalize(employee);
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
    dateOfBirth?: string;
    hireDate?: string;
    officeLocation?: string;
    manager?: string | null;
    employmentType?: string;
    photoUrl?: string | null;
  }
) {
  const {
    firstName,
    middleName,
    lastName,
    workEmail,
    department,
    designation,
    role,
    dateOfBirth,
    hireDate,
    officeLocation,
    manager,
    employmentType,
    photoUrl,
  } = body;

  if (!firstName || !lastName || !workEmail) {
    throw new ApiError(400, "First name, last name and work email are required");
  }
  if (!hireDate || !officeLocation) {
    throw new ApiError(400, "Hire date and office location are required");
  }
  await assertValidOfficeLocation(officeLocation);
  if (department) {
    await assertValidDepartment(department);
  }
  const resolvedEmploymentType = employmentType || "full_time";
  await assertValidEmploymentType(resolvedEmploymentType);

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

  const { defaultEmployeePassword } = await settingsRepository.getLean();
  const passwordHash = await hashPassword(defaultEmployeePassword);

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
          status: "pending_onboarding",
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          hireDate: new Date(hireDate),
          officeLocation: String(officeLocation).trim(),
          manager: manager || null,
          employmentType: resolvedEmploymentType as never,
          photoUrl: photoUrl || null,
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
    credentials: { username: normalizedEmail, temporaryPassword: defaultEmployeePassword },
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
    status?: "pending_onboarding" | "active" | "inactive" | "suspended";
    dateOfBirth?: string | null;
    hireDate?: string;
    officeLocation?: string;
    manager?: string | null;
    employmentType?: string;
    photoUrl?: string | null;
  }
) {
  const {
    firstName,
    middleName,
    lastName,
    department,
    designation,
    role,
    active,
    status,
    dateOfBirth,
    hireDate,
    officeLocation,
    manager,
    employmentType,
    photoUrl,
  } = body;

  const existing = await employeeRepository.findById(id);
  if (!existing) throw new ApiError(404, "Employee not found");

  if (manager && manager === id) {
    throw new ApiError(400, "An employee can't be their own manager");
  }
  if (manager) {
    await assertNoManagerCycle(id, manager);
  }
  if (officeLocation !== undefined && officeLocation) {
    await assertValidOfficeLocation(officeLocation);
  }
  if (department !== undefined && department) {
    await assertValidDepartment(department);
  }
  if (employmentType !== undefined && employmentType) {
    await assertValidEmploymentType(employmentType);
  }

  const wasActive = existing.active;
  const previousManagerId = existing.manager ? String(existing.manager) : null;

  if (firstName !== undefined) existing.firstName = String(firstName).trim();
  if (middleName !== undefined) existing.middleName = String(middleName).trim();
  if (lastName !== undefined) existing.lastName = String(lastName).trim();
  if (department !== undefined) existing.department = String(department).trim();
  if (designation !== undefined) existing.designation = String(designation).trim();
  if (role !== undefined) existing.role = role === "admin" ? "admin" : "staff";
  if (dateOfBirth !== undefined) existing.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
  if (hireDate !== undefined) existing.hireDate = hireDate ? new Date(hireDate) : null;
  if (officeLocation !== undefined) existing.officeLocation = String(officeLocation).trim();
  if (manager !== undefined) existing.manager = (manager || null) as never;
  if (employmentType !== undefined) existing.employmentType = employmentType as never;
  if (photoUrl !== undefined) existing.photoUrl = photoUrl || null;

  // `status` is the authoritative lifecycle field going forward; a bare
  // `active` boolean (from older/simpler callers) is still honored by
  // mapping it onto the nearest equivalent status.
  if (status !== undefined) {
    existing.status = status;
    existing.active = status === "active" || status === "pending_onboarding";
  } else if (active !== undefined) {
    existing.active = Boolean(active);
    existing.status = existing.active
      ? existing.status === "pending_onboarding"
        ? "pending_onboarding"
        : "active"
      : "inactive";
  }

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

  const newManagerId = existing.manager ? String(existing.manager) : null;
  if (manager !== undefined && newManagerId !== previousManagerId) {
    await leaveRequestService.reassignManagerStage(id, newManagerId);
  }

  return existing;
}

async function celebrations() {
  const employees = await employeeRepository.findCelebrationFields();
  return employees.map((e) => ({ ...e, dateOfBirth: e.dateOfBirth ?? null, hireDate: e.hireDate ?? null }));
}

async function remove(id: string) {
  // Capture direct reports *before* deleting - once clearManagerReferences
  // runs there's no way to tell who used to report to this person.
  const directReports = await employeeRepository.findByManager(id);

  const employee = await employeeRepository.findByIdAndDelete(id);
  if (!employee) throw new ApiError(404, "Employee not found");
  if (employee.user) {
    await userRepository.findByIdAndDelete(employee.user.toString());
  }
  await employeeRepository.clearManagerReferences(id);

  // Any of their reports' requests waiting on this now-deleted manager
  // would otherwise sit at approvalStage "manager" forever with nobody
  // able to act on them - promote those to admin review instead.
  for (const report of directReports) {
    await leaveRequestService.reassignManagerStage(String(report._id), null);
  }
}

export const employeeService = {
  list,
  me,
  celebrations,
  create,
  update,
  remove,
};
