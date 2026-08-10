import mongoose, { Schema, models, model } from "mongoose";

/** No longer a fixed union - validated at request time against the
 * admin-configured `settings.leaveTypes` list instead (see
 * leaveRequest.service.ts), so admins can add/remove types without a
 * migration. Old documents keep whatever key was valid when they were
 * created even if that type is later removed from Settings. */
export type LeaveType = string;
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
/** Whose turn it is to act while `status === "pending"`. Set at creation
 * from `settings.leaveApprovalFlow` + whether the employee has a manager,
 * and advanced by leaveRequest.service.review(). Meaningless once the
 * request leaves "pending". */
export type LeaveApprovalStage = "manager" | "admin" | "done";
export type LeaveApprovalFlow = "admin_only" | "manager_only" | "manager_then_admin";

export interface LeaveRequestDocument extends mongoose.Document {
  employee: mongoose.Types.ObjectId;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  /** Inclusive calendar-day count between startDate/endDate - a simple
   * headline number for the list views, not a working-days calculation
   * (doesn't exclude weekends/holidays). */
  totalDays: number;
  reason: string;
  /** Set when an admin submitted this on the employee's behalf (rather than
   * the employee submitting it themselves) - null otherwise. Purely an
   * audit trail; it has no effect on the approval flow itself. */
  submittedByAdmin: mongoose.Types.ObjectId | null;
  status: LeaveRequestStatus;
  approvalStage: LeaveApprovalStage;
  /** `settings.leaveApprovalFlow` as it was when this request was created -
   * the manager-approval decision (finalize vs hand off to admin) reads
   * this instead of the live setting, so an admin changing the flow later
   * doesn't retroactively change how requests already in flight resolve. */
  approvalFlowSnapshot: LeaveApprovalFlow;
  /** Populated only when a manager approval step actually happened (i.e.
   * the "manager_then_admin" flow's first stage) - kept separate from
   * reviewedBy/reviewedAt/reviewNote below, which always represent the
   * *final* decision maker regardless of flow. */
  managerDecision: "approved" | "rejected" | null;
  managerReviewedBy: mongoose.Types.ObjectId | null;
  managerReviewedAt: Date | null;
  managerNote: string | null;
  reviewedBy: mongoose.Types.ObjectId | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

const LeaveRequestSchema = new Schema<LeaveRequestDocument>({
  employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  type: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: { type: Number, required: true },
  reason: { type: String, default: "", trim: true },
  submittedByAdmin: { type: Schema.Types.ObjectId, ref: "User", default: null },
  status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending" },
  approvalStage: { type: String, enum: ["manager", "admin", "done"], default: "admin" },
  approvalFlowSnapshot: {
    type: String,
    enum: ["admin_only", "manager_only", "manager_then_admin"],
    default: "admin_only",
  },
  managerDecision: { type: String, enum: ["approved", "rejected"], default: null },
  managerReviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  managerReviewedAt: { type: Date, default: null },
  managerNote: { type: String, default: null },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  reviewNote: { type: String, default: null },
  reviewedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

LeaveRequestSchema.index({ employee: 1, createdAt: -1 });
LeaveRequestSchema.index({ status: 1, createdAt: -1 });

export default models.LeaveRequest || model<LeaveRequestDocument>("LeaveRequest", LeaveRequestSchema);
