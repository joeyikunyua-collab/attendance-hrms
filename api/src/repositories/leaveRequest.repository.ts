import LeaveRequest, { LeaveRequestDocument } from "../models/LeaveRequest";

const EMPLOYEE_POPULATE = "name employeeId department designation photoUrl";

export const leaveRequestRepository = {
  findByEmployeeSorted(employeeId: string) {
    return LeaveRequest.find({ employee: employeeId })
      .sort({ createdAt: -1 })
      .populate("employee", EMPLOYEE_POPULATE)
      .lean<LeaveRequestDocument[]>();
  },

  /** `pending` narrows to the actionable queue; `history` is everything
   * already decided (approved/rejected/cancelled) - deliberately mutually
   * exclusive so the two tabs never show overlapping rows. */
  findAllSorted(scope: "pending" | "history") {
    const filter = scope === "pending" ? { status: "pending" } : { status: { $ne: "pending" } };
    return LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("employee", EMPLOYEE_POPULATE)
      .lean<LeaveRequestDocument[]>();
  },

  findById(id: string) {
    return LeaveRequest.findById(id).populate("employee", EMPLOYEE_POPULATE);
  },

  /** Pending requests currently waiting on one of `managerId`'s direct
   * reports - the manager's personal approval queue. */
  findPendingForManager(employeeIds: string[]) {
    return LeaveRequest.find({ employee: { $in: employeeIds }, status: "pending", approvalStage: "manager" })
      .sort({ createdAt: -1 })
      .populate("employee", EMPLOYEE_POPULATE)
      .lean<LeaveRequestDocument[]>();
  },

  /** Requests still waiting on this specific employee's manager step - used
   * to re-route them when the employee's manager changes or is removed. */
  findPendingManagerStageForEmployee(employeeId: string) {
    return LeaveRequest.find({ employee: employeeId, status: "pending", approvalStage: "manager" })
      .select("_id type totalDays")
      .lean<{ _id: unknown; type: string; totalDays: number }[]>();
  },

  promoteToAdminStage(ids: string[]) {
    return LeaveRequest.updateMany({ _id: { $in: ids } }, { $set: { approvalStage: "admin" } });
  },

  deleteById(id: string) {
    return LeaveRequest.findByIdAndDelete(id);
  },

  /** Everything counting toward this employee's leave balance for the
   * calendar year [yearStart, yearEnd] - pending requests reserve against
   * the quota too, so it can't be over-committed while awaiting review.
   * Matched by *overlap* rather than "startDate falls in this year", so a
   * request spanning New Year's is still found from either year's query -
   * the caller prorates it with dateRangeDaysInYear(). */
  findForBalance(employeeId: string, yearStart: Date, yearEnd: Date) {
    return LeaveRequest.find({
      employee: employeeId,
      status: { $in: ["pending", "approved"] },
      startDate: { $lte: yearEnd },
      endDate: { $gte: yearStart },
    })
      .select("_id type startDate endDate totalDays createdAt")
      .lean<{ _id: unknown; type: string; startDate: Date; endDate: Date; totalDays: number; createdAt: Date }[]>();
  },

  create(data: Partial<LeaveRequestDocument>) {
    return LeaveRequest.create(data);
  },
};
