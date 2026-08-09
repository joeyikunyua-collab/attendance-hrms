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

/** `leaveRequestRepository.findById` always populates `employee`, so
 * `request.employee` is a hydrated Employee document, not a raw ObjectId -
 * `String(request.employee)` would stringify the wrong thing. Pull the id
 * off it explicitly instead. */
function employeeIdOf(request: { employee: unknown }): string {
  return String((request.employee as { _id: unknown })._id);
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

async function create(
  user: AuthUser,
  body: { type?: LeaveType; startDate?: string; endDate?: string; reason?: string }
) {
  const { type, startDate, endDate, reason } = body;
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

  const employee = await employeeRepository.findByUserSelectIdAndManager(user.id);
  if (!employee) {
    throw new ApiError(403, "No employee record is linked to this account");
  }

  const totalDays = daysBetween(start, end);

  if (leaveType.annualQuota !== null) {
    const yearStart = new Date(start.getFullYear(), 0, 1);
    const yearEnd = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
    const existing = await leaveRequestRepository.findForBalance(String(employee._id), yearStart, yearEnd);
    const used = existing.filter((r) => r.type === type).reduce((sum, r) => sum + r.totalDays, 0);
    const remaining = leaveType.annualQuota - used;
    if (totalDays > remaining) {
      throw new ApiError(
        400,
        `Insufficient ${leaveType.label} balance: ${Math.max(remaining, 0)} of ${leaveType.annualQuota} day(s) remaining this year`
      );
    }
  }

  const stage = resolveInitialStage(leaveApprovalFlow, !!employee.manager);

  const request = await leaveRequestRepository.create({
    employee: employee._id as never,
    type,
    startDate: start,
    endDate: end,
    totalDays,
    reason: reason ? String(reason).trim() : "",
    status: "pending",
    approvalStage: stage,
  });

  if (stage === "manager" && employee.manager) {
    const manager = await employeeRepository.findByIdLean(String(employee.manager));
    if (manager?.user) {
      await notificationService.notifyUser(String(manager.user), {
        type: "leave_request_submitted",
        title: "New leave request from your team",
        body: `${user.name} requested ${totalDays} day(s) off (${leaveType.label}).`,
      });
    }
  } else {
    await notificationService.notifyAdmins({
      type: "leave_request_submitted",
      title: "New leave request",
      body: `${user.name} requested ${totalDays} day(s) off (${leaveType.label}).`,
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

/** Per-leave-type balance for the caller, for the calendar year `startDate`
 * falls in - "no of leaves" a type allows, minus what's already
 * pending/approved this year. `remaining: null` means unlimited. */
async function balance(userId: string) {
  const employee = await resolveOwnEmployee(userId);
  const { leaveTypes } = await settingsRepository.getLean();

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  const requests = await leaveRequestRepository.findForBalance(String(employee._id), yearStart, yearEnd);

  return leaveTypes.map((lt) => {
    const used = requests.filter((r) => r.type === lt.key).reduce((sum, r) => sum + r.totalDays, 0);
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

  if (actor.role === "admin") {
    // Admins can always act, regardless of whose turn the approval stage
    // says it is - an intentional override so nothing ever gets stuck
    // waiting on an absent manager.
    request.status = decision;
    request.approvalStage = "done";
    request.reviewedBy = actor.id as never;
    request.reviewNote = trimmedNote;
    request.reviewedAt = new Date();
  } else {
    if (request.approvalStage !== "manager") {
      throw new ApiError(403, "This request isn't awaiting your review");
    }
    const manager = await employeeRepository.findByUserSelectId(actor.id);
    const employeeRecord = await employeeRepository.findByIdSelectManager(employeeIdOf(request));
    if (!manager || !employeeRecord?.manager || String(employeeRecord.manager) !== String(manager._id)) {
      throw new ApiError(403, "You're not this employee's manager");
    }

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
    } else {
      const { leaveApprovalFlow } = await settingsRepository.getLean();
      if (leaveApprovalFlow === "manager_then_admin") {
        request.approvalStage = "admin";
        // status stays "pending" - the admin still has the final say.
      } else {
        request.status = "approved";
        request.approvalStage = "done";
        request.reviewedBy = actor.id as never;
        request.reviewNote = trimmedNote;
        request.reviewedAt = new Date();
      }
    }
  }

  await request.save();

  const employee = await employeeRepository.findByIdLean(employeeIdOf(request));
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

export const leaveRequestService = {
  create,
  listMine,
  listAll,
  listForReview,
  balance,
  review,
  cancel,
};
