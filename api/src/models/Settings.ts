import mongoose, { Schema, models, model } from "mongoose";

/** A configurable announcement category - `key` is the immutable identifier
 * stored on Announcement documents; `label` is what's shown and is freely
 * editable without touching existing posts. */
export interface AnnouncementCategoryConfig {
  key: string;
  label: string;
}

/** A configurable leave type with its own annual allowance. `annualQuota`
 * of `null` means unlimited (e.g. unpaid leave) - no balance is tracked
 * against it. */
export interface LeaveTypeConfig {
  key: string;
  label: string;
  annualQuota: number | null;
  paid: boolean;
}

/** A configurable employment type - `key` is the immutable identifier
 * stored on Employee documents; `label` is what's shown. */
export interface EmploymentTypeConfig {
  key: string;
  label: string;
}

export type LeaveApprovalFlow = "admin_only" | "manager_only" | "manager_then_admin";

/**
 * Singleton document (fixed _id) holding system-wide configuration that was
 * previously hardcoded/env-based - branding, overtime/weekend rules,
 * onboarding defaults, and (as of this round) the configurable lists that
 * drive office locations, announcement categories, and the leave module.
 * Exactly one of these ever exists; see settingsRepository.get() for the
 * get-or-create logic.
 */
export interface SettingsDocument extends Omit<mongoose.Document, "_id"> {
  _id: string;
  companyName: string;
  companyLogoUrl: string | null;
  /** Minutes a shift can run before it's flagged "Overtime" in the attendance UI. */
  overtimeThresholdMinutes: number;
  /** JS Date.getDay() values (0=Sunday..6=Saturday) treated as non-working days. */
  weekendDays: number[];
  /** "HH:MM" 24h - window during which an unchecked-in employee gets a reminder. */
  checkInReminderStart: string;
  checkInReminderEnd: string;
  /** Shared temporary password assigned to every newly-created employee login. */
  defaultEmployeePassword: string;
  minPasswordLength: number;
  /** Selectable office locations, offered on the employee onboarding form. */
  officeLocations: string[];
  /** Selectable departments, offered on the employee onboarding form. */
  departments: string[];
  employmentTypes: EmploymentTypeConfig[];
  announcementCategories: AnnouncementCategoryConfig[];
  leaveTypes: LeaveTypeConfig[];
  /** Who has to sign off on a leave request before it's final - see
   * leaveRequest.service.ts for how this drives the approval state machine. */
  leaveApprovalFlow: LeaveApprovalFlow;
  updatedAt: Date;
  updatedBy: mongoose.Types.ObjectId | null;
}

const AnnouncementCategorySchema = new Schema<AnnouncementCategoryConfig>(
  { key: { type: String, required: true }, label: { type: String, required: true } },
  { _id: false }
);

const EmploymentTypeSchema = new Schema<EmploymentTypeConfig>(
  { key: { type: String, required: true }, label: { type: String, required: true } },
  { _id: false }
);

const LeaveTypeSchema = new Schema<LeaveTypeConfig>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    annualQuota: { type: Number, default: null },
    paid: { type: Boolean, default: true },
  },
  { _id: false }
);

const SettingsSchema = new Schema<SettingsDocument>({
  _id: { type: String },
  companyName: { type: String, default: "Attendance System", trim: true },
  companyLogoUrl: { type: String, default: null },
  overtimeThresholdMinutes: { type: Number, default: 480 },
  weekendDays: { type: [Number], default: [0, 6] },
  checkInReminderStart: { type: String, default: "09:00" },
  checkInReminderEnd: { type: String, default: "12:00" },
  defaultEmployeePassword: { type: String, default: "Welcome@123" },
  minPasswordLength: { type: Number, default: 8 },
  officeLocations: { type: [String], default: [] },
  departments: { type: [String], default: [] },
  employmentTypes: {
    type: [EmploymentTypeSchema],
    default: [
      { key: "full_time", label: "Full-time" },
      { key: "part_time", label: "Part-time" },
      { key: "contract", label: "Contract" },
      { key: "intern", label: "Intern" },
    ],
  },
  announcementCategories: {
    type: [AnnouncementCategorySchema],
    default: [
      { key: "company_update", label: "Company Update" },
      { key: "policy", label: "Policy" },
      { key: "event", label: "Event" },
    ],
  },
  leaveTypes: {
    type: [LeaveTypeSchema],
    default: [
      { key: "vacation", label: "Vacation", annualQuota: 12, paid: true },
      { key: "sick", label: "Sick Leave", annualQuota: 10, paid: true },
      { key: "personal", label: "Personal", annualQuota: 5, paid: true },
      { key: "unpaid", label: "Unpaid Leave", annualQuota: null, paid: false },
      { key: "other", label: "Other", annualQuota: null, paid: true },
    ],
  },
  leaveApprovalFlow: {
    type: String,
    enum: ["admin_only", "manager_only", "manager_then_admin"],
    default: "admin_only",
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
});

export default models.Settings || model<SettingsDocument>("Settings", SettingsSchema);
