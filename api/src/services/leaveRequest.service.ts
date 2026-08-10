import { leaveRequestRepository } from "../repositories/leaveRequest.repository";
import { employeeRepository } from "../repositories/employee.repository";
import { settingsRepository } from "../repositories/settings.repository";
import { notificationService } from "./notification.service";
import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../types";
import type { LeaveApprovalStage, LeaveType } from "../models/LeaveRequest";
import type { LeaveTypeConfig } from "../models/Settings";

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

/** Used for the repository overlap query only - doesn't need day-precision,
 * just needs to land somewhere within Dec 31. daysInYear() below does its
 * own boundary math for actual day counting. */
function yearRange(year: number): { yearStart: Date; yearEnd: Date } {
  return { yearStart: new Date(year, 0, 1), yearEnd: new Date(year, 11, 31, 23, 59, 59, 999) };
}

/** How many of [start, end]'s days fall within calendar year `year` - used
 * to prorate a request that spans New Year's, instead of charging the
 * whole thing against whichever year it starts in. `start`/`end` are always
 * midnight-aligned (parsed from "YYYY-MM-DD"), so this clamps against
 * exclusive year boundaries (midnight Jan 1 of `year` and of `year + 1`)
 * rather than an end-of-day instant - mixing the two breaks the inclusive
 * day count by a fraction of a day right at the boundary. */
function daysInYear(start: Date, end: Date, year: number): number {
  const yearStart = new Date(year, 0, 1);
  const nextYearStart = new Date(year + 1, 0, 1);
  const endExclusive = new Date(end.getTime() + 86400000); // end is inclusive; its exclusive bound is the next day
  const clampedStart = start < yearStart ? yearStart : start;
  const clampedEndExclusive = endExclusive > nextYearStart ? nextYearStart : endExclusive;
  if (clampedStart >= clampedEndExclusive) return 0;
  return Math.round((clampedEndExclusive.getTime() - clampedStart.getTime()) / 86400000);
}

/** `leaveRequestRepository.findById` always populates `employee`, so
 * `request.employee` is a hydrated Employee document, not a raw ObjectId -
 * `String(request.employee)` would stringify the wrong thing. Pull the id
 * off it explicitly instead. `employee` can also be `null` if the record
 * has since been deleted - callers that need the id must check first. */
function employeeIdOf(request: { employee: unknown }): string | null {
  const employee = request.employee as { _id: unknown } | null;
  return employee ? String(employee._id) : null;
}

async function resolveOwnEmployee(userId: string) {
  const employee = await employeeRepository.findByUserSelectId(userId);
  if (!employee) {
    throw new ApiError(403, "No employee record is linked to this account");
  }
  return employee;
}

function findLeaveType(leaveTypes: LeaveTypeConfig[], key: string): LeaveTypeConfig | undefined {
  return leaveTypes.find((t) => t.key === key);
}

/** Decides whose turn it is to act first, based on the configured flow and
 * whether the employee actually has a manager assigned - a flow that wants
 * manager approval degrades gracefully to admin-only when there's nobody to
 * route it to, rather than creating a request nobody can ever act on. */
function resolveInitialStage(flow: string, hasManager: boolean): LeaveApprovalStage {
  if (flow === "admin_only") return "admin";
  return hasManager ? "manager" : "admin";
}

/** Rejects if `portionDays` (this request's slice of `year`) would push the
 * employee over `leaveType`'s annual quota for that year, given everything
 * else already pending/approved. */
async function assertWithinBalance(
  employeeId: string,
  leaveType: LeaveTypeConfig,
  type: string,
  start: Date,
  end: Date
) {
  if (leaveType.annualQuota === null) return;

  for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
    const portionDays = daysInYear(start, end, year);
    if (portionDays === 0) continue;

    const { yearStart, yearEnd } = yearRange(year);
    const existing = await leaveRequestRepository.findForBalance(employeeId, yearStart, yearEnd);
    const used = existing
      .filter((r) => r.type === type)
      .reduce((sum, r) => sum + daysInYear(new Date(r.startDate), new Date(r.endDate), year), 0);
    const remaining = leaveType.annualQuota - used;
    if (portionDays > remaining) {
      throw new ApiError(
        400,
        `Insufficient ${leaveType.label} balance for ${year}: ${Math.max(remaining, 0)} of ${leaveType.annualQuota} day(s) remaining`
      );
    }
  }
}

async function create(
  user: AuthUser,
  body: { type?: LeaveType; startDate?: string; endDate?: string; reason?: string; employeeId?: string }
) {
  const { type, startDate, endDate, reason, employeeId: targetEmployeeId } = body;
  if (!type || !startDate || !endDate) {
    throw new ApiError(400, "Type, start date, and end date are required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) {
    throw new ApiError(400, "Start date must be on or before the end date");
  }

  const { leaveTypes, leaveApprovalFlow } = await settingsRepository.getLean();
  const leaveType = findLeaveType(leaveTypes, type);
  if (!leaveType) {
    throw new ApiError(400, "That leave type is no longer available - please choose another");
  }

  // An admin can submit on behalf of any employee; everyone else can only
  // ever submit for themselves. Both branches converge on the same
  // findByIdLean() shape so the rest of this function doesn't need to care
  // which path it came from.
  let resolvedEmployeeId: string;
  let submittedByAdmin: string | null = null;
  if (targetEmployeeId) {
    if (user.role !== "admin") {
      throw new ApiError(403, "Only admins can submit a request on behalf of another employee");
    }
    resolvedEmployeeId = targetEmployeeId;
    submittedByAdmin = user.id;
  } else {
    const own = await employeeRepository.findByUserSelectId(user.id);
    if (!own) {
      throw new ApiError(403, "No employee record is linked to this account");
    }
    resolvedEmployeeId = String(own._id);
  }

  const employee = await employeeRepository.findByIdLean(resolvedEmployeeId);
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }
  if (submittedByAdmin && !employee.active) {
    throw new ApiError(400, "Can't submit a leave request for an inactive employee");
  }
  const employeeId = String(employee._id);

  const totalDays = daysBetween(start, end);
  await assertWithinBalance(employeeId, leaveType, type, start, end);

  const stage = resolveInitialStage(leaveApprovalFlow, !!employee.manager);

  const request = await leaveRequestRepository.create({
    employee: employee._id as never,
    type,
    startDate: start,
    endDate: end,
    totalDays,
    reason: reason ? String(reason).trim() : "",
    submittedByAdmin: submittedByAdmin as never,
    status: "pending",
    approvalStage: stage,
    approvalFlowSnapshot: leaveApprovalFlow as never,
  });

  // Re-verify post-insert to catch a concurrent submission that raced past
  // the same pre-check above (there's no DB transaction wrapping the two).
  // Both requests are now visible to this query regardless of which one
  // ran the check first, so this resolves deterministically: accept
  // earliest-created first up to the quota, and if *this* request is the
  // one that pushes the running total over, undo it. A process can only
  // ever delete the request it just created, never someone else's.
  if (leaveType.annualQuota !== null) {
    for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
      if (daysInYear(start, end, year) === 0) continue;
      const { yearStart, yearEnd } = yearRange(year);
      const existing = await leaveRequestRepository.findForBalance(employeeId, yearStart, yearEnd);
      const sameType = existing
        .filter((r) => r.type === type)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      let cumulative = 0;
      let overcommitted = false;
      for (const r of sameType) {
        cumulative += daysInYear(new Date(r.startDate), new Date(r.endDate), year);
        if (cumulative > leaveType.annualQuota) {
          overcommitted = String(r._id) === request._id.toString();
          break;
        }
      }
      if (overcommitted) {
        await leaveRequestRepository.deleteById(request._id.toString());
        throw new ApiError(
          409,
          `Leave balance changed while submitting - please try again (${leaveType.label} limit reached for ${year}).`
        );
      }
    }
  }

  // Notification body is framed around the employee the leave is for, not
  // who clicked submit - reads the same whether they submitted it
  // themselves or an admin did it on their behalf.
  const submittedNote = submittedByAdmin ? ` (submitted by ${user.name})` : "";
  if (stage === "manager" && employee.manager) {
    const manager = await employeeRepository.findByIdLean(String(employee.manager));
    if (manager?.user) {
      await notificationService.notifyUser(String(manager.user), {
        type: "leave_request_submitted",
        title: "New leave request from your team",
        body: `${employee.name} requested ${totalDays} day(s) off (${leaveType.label}).${submittedNote}`,
      });
    }
  } else {
    await notificationService.notifyAdmins(
      {
        type: "leave_request_submitted",
        title: "New leave request",
        body: `${employee.name} requested ${totalDays} day(s) off (${leaveType.label}).${submittedNote}`,
      },
      user.id
    );
  }

  if (submittedByAdmin && employee.user) {
    await notificationService.notifyUser(String(employee.user), {
      type: "leave_request_submitted",
      title: "A leave request was submitted for you",
      body: `${user.name} submitted a ${totalDays} day(s) ${leaveType.label} request on your behalf.`,
    });
  }

  return leaveRequestRepository.findById(request._id.toString());
}

async function listMine(userId: string) {
  const employee = await resolveOwnEmployee(userId);
  return leaveRequestRepository.findByEmployeeSorted(String(employee._id));
}

async function listAll(scope: "pending" | "history") {
  return leaveRequestRepository.findAllSorted(scope);
}

/** The caller's personal manager-approval queue: pending requests from
 * their direct reports that are waiting on the manager stage. Empty (not an
 * error) for anyone who doesn't manage anybody. */
async function listForReview(userId: string) {
  const employee = await resolveOwnEmployee(userId);
  const reports = await employeeRepository.findByManager(String(employee._id));
  if (!reports.length) return [];
  return leaveRequestRepository.findPendingForManager(reports.map((r) => String(r._id)));
}

/** Per-leave-type balance for the current calendar year - "no of leaves" a
 * type allows, minus what's already pending/approved this year (prorated
 * for any request that spans into a different year). `remaining: null`
 * means unlimited. Defaults to the caller's own balance; an admin can pass
 * `targetEmployeeId` to preview someone else's before submitting on their
 * behalf. */
async function balance(actor: AuthUser, targetEmployeeId?: string) {
  let employeeId: string;
  if (targetEmployeeId) {
    if (actor.role !== "admin") {
      throw new ApiError(403, "Only admins can view another employee's balance");
    }
    employeeId = targetEmployeeId;
  } else {
    const own = await resolveOwnEmployee(actor.id);
    employeeId = String(own._id);
  }

  const { leaveTypes } = await settingsRepository.getLean();

  const year = new Date().getFullYear();
  const { yearStart, yearEnd } = yearRange(year);
  const requests = await leaveRequestRepository.findForBalance(employeeId, yearStart, yearEnd);

  return leaveTypes.map((lt) => {
    const used = requests
      .filter((r) => r.type === lt.key)
      .reduce((sum, r) => sum + daysInYear(new Date(r.startDate), new Date(r.endDate), year), 0);
    return {
      ...lt,
      used,
      remaining: lt.annualQuota === null ? null : Math.max(lt.annualQuota - used, 0),
    };
  });
}

async function review(id: string, actor: AuthUser, decision: "approved" | "rejected", note?: string) {
  const request = await leaveRequestRepository.findById(id);
  if (!request) throw new ApiError(404, "Leave request not found");
  if (request.status !== "pending") {
    throw new ApiError(409, "This request has already been reviewed");
  }

  const trimmedNote = note ? String(note).trim() : null;

  // Whether *this specific caller* is the request's assigned manager is
  // checked first, even for admins - an admin who also happens to be this
  // employee's direct manager should still go through the manager step
  // (so a "manager, then admin" flow keeps its two-person separation
  // instead of the same person collapsing both steps into one click).
  // Admins who AREN'T the assigned manager still get full override power
  // below, at any stage - that's what keeps nothing from getting stuck.
  let actsAsManager = false;
  if (request.approvalStage === "manager") {
    const employeeId = employeeIdOf(request);
    const callerEmployee = await employeeRepository.findByUserSelectId(actor.id);
    const employeeRecord = employeeId ? await employeeRepository.findByIdSelectManager(employeeId) : null;
    actsAsManager =
      !!callerEmployee &&
      !!employeeRecord?.manager &&
      String(employeeRecord.manager) === String(callerEmployee._id);
  }

  if (actsAsManager) {
    request.managerDecision = decision;
    request.managerReviewedBy = actor.id as never;
    request.managerReviewedAt = new Date();
    request.managerNote = trimmedNote;

    if (decision === "rejected") {
      request.status = "rejected";
      request.approvalStage = "done";
      request.reviewedBy = actor.id as never;
      request.reviewNote = trimmedNote;
      request.reviewedAt = new Date();
    } else if (request.approvalFlowSnapshot === "manager_then_admin") {
      request.approvalStage = "admin";
      // status stays "pending" - the admin still has the final say. Uses
      // the flow that was in effect when this request was *submitted*
      // (approvalFlowSnapshot), not whatever the live setting is now, so
      // an admin changing the flow mid-flight doesn't retroactively alter
      // how a request already in progress resolves.
    } else {
      request.status = "approved";
      request.approvalStage = "done";
      request.reviewedBy = actor.id as never;
      request.reviewNote = trimmedNote;
      request.reviewedAt = new Date();
    }
  } else if (actor.role === "admin") {
    // Admin override - acts regardless of whose turn approvalStage says it
    // is (covers admin_only flow, an admin stepping in on someone else's
    // report, or rescuing a request whose manager is gone).
    request.status = decision;
    request.approvalStage = "done";
    request.reviewedBy = actor.id as never;
    request.reviewNote = trimmedNote;
    request.reviewedAt = new Date();
  } else {
    throw new ApiError(403, "This request isn't awaiting your review");
  }

  await request.save();

  const employeeId = employeeIdOf(request);
  const employee = employeeId ? await employeeRepository.findByIdLean(employeeId) : null;
  if (request.approvalStage === "admin" && request.status === "pending") {
    // Manager approved, now waiting on an admin.
    await notificationService.notifyAdmins({
      type: "leave_request_manager_approved",
      title: "Leave request needs admin review",
      body: `${employee?.name ?? "An employee"}'s ${request.type} request was approved by their manager and now needs your sign-off.`,
    });
  } else if (employee?.user) {
    await notificationService.notifyUser(String(employee.user), {
      type: "leave_request_reviewed",
      title: request.status === "approved" ? "Leave request approved" : "Leave request declined",
      body:
        request.status === "approved"
          ? `Your ${request.type} request for ${request.totalDays} day(s) was approved.`
          : `Your ${request.type} request for ${request.totalDays} day(s) was declined.${
              trimmedNote ? ` Note: ${trimmedNote}` : ""
            }`,
    });
  }

  return request;
}

async function cancel(id: string, user: AuthUser) {
  const request = await leaveRequestRepository.findById(id);
  if (!request) throw new ApiError(404, "Leave request not found");
  if (request.status !== "pending") {
    throw new ApiError(409, "Only a pending request can be cancelled");
  }

  if (user.role !== "admin") {
    const employee = await resolveOwnEmployee(user.id);
    if (employeeIdOf(request) !== String(employee._id)) {
      throw new ApiError(403, "You can only cancel your own requests");
    }
  }

  request.status = "cancelled";
  request.approvalStage = "done";
  request.reviewedAt = new Date();
  await request.save();
  return request;
}

/** Called whenever an employee's manager assignment changes (reassigned or
 * removed - including via deletion of the old manager) - any of their
 * requests still waiting on a manager decision need to be re-routed, since
 * the person who was supposed to act on them may no longer be the right
 * person, or may not exist anymore. Without this, those requests would sit
 * at approvalStage "manager" forever with nobody able to pass the
 * ownership check (only an admin override could ever touch them again). */
async function reassignManagerStage(employeeId: string, newManagerId: string | null) {
  const pending = await leaveRequestRepository.findPendingManagerStageForEmployee(employeeId);
  if (!pending.length) return;

  if (newManagerId) {
    const manager = await employeeRepository.findByIdLean(newManagerId);
    if (manager?.user) {
      await notificationService.notifyUser(String(manager.user), {
        type: "leave_request_submitted",
        title: "Leave request awaiting your review",
        body: `${pending.length} leave request(s) are waiting on your review after a manager change.`,
      });
    }
  } else {
    await leaveRequestRepository.promoteToAdminStage(pending.map((r) => String(r._id)));
    await notificationService.notifyAdmins({
      type: "leave_request_manager_approved",
      title: "Leave request needs admin review",
      body: `${pending.length} leave request(s) need admin review because their manager was removed.`,
    });
  }
}

export const leaveRequestService = {
  create,
  listMine,
  listAll,
  listForReview,
  balance,
  review,
  cancel,
  reassignManagerStage,
};
