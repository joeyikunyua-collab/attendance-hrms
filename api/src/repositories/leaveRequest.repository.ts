import LeaveRequest, { LeaveRequestDocument } from "../models/LeaveRequest";

const EMPLOYEE_POPULATE = "name employeeId department photoUrl";

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

  /** Everything counting toward this employee's leave balance for the
   * calendar year `startDate` falls in - pending requests reserve against
   * the quota too, so it can't be over-committed while awaiting review. */
  findForBalance(employeeId: string, yearStart: Date, yearEnd: Date) {
    return LeaveRequest.find({
      employee: employeeId,
      status: { $in: ["pending", "approved"] },
      startDate: { $gte: yearStart, $lte: yearEnd },
    })
      .select("type totalDays")
      .lean<{ type: string; totalDays: number }[]>();
  },

  create(data: Partial<LeaveRequestDocument>) {
    return LeaveRequest.create(data);
  },
};
