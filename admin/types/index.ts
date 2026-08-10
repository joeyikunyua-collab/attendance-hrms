export type EmployeeStatus = "pending_onboarding" | "active" | "inactive" | "suspended";
/** Free-form key matching one of `SystemSettings.employmentTypes` - not a
 * fixed union, since admins can add/remove employment types. */
export type EmploymentType = string;

export interface EmployeeManagerRef {
  _id: string;
  name: string;
  employeeId: string;
}

export interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  name: string;
  workEmail: string;
  department: string;
  designation: string;
  role: "admin" | "staff";
  user: string | null;
  /** Derived from `status` - kept for call sites that only care whether the
   * employee currently counts as staff (attendance eligibility, pickers). */
  active: boolean;
  status: EmployeeStatus;
  dateOfBirth: string | null;
  hireDate: string | null;
  officeLocation: string;
  // Populated on read (GET /employees); write requests send a plain id string.
  manager: EmployeeManagerRef | null;
  employmentType: EmploymentType;
  photoUrl: string | null;
  createdAt: string;
}

export interface EmployeeCredentials {
  username: string;
  temporaryPassword: string;
}

export type AttendanceStatus = "present" | "late" | "absent";

export interface AttendanceRecord {
  _id: string;
  // Populated employee, or null if the referenced employee has since been deleted.
  employee: Employee | string | null;
  date: string; // YYYY-MM-DD
  checkIn: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkInAccuracy: number | null;
  checkInIp: string | null;
  checkOut: string | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutAccuracy: number | null;
  checkOutIp: string | null;
  status: AttendanceStatus;
  notes?: string;
  auditNote: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: "admin" | "staff";
  mustChangePassword?: boolean;
}

export interface ApiError {
  message: string;
}

export interface LoginEvent {
  _id: string;
  user: string;
  username: string;
  name: string;
  role: "admin" | "staff";
  loggedInAt: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  locationError: string | null;
}

export type NotificationType =
  | "employee_created"
  | "password_changed"
  | "checked_in"
  | "checked_out"
  | "checkin_reminder"
  | "announcement_posted"
  | "celebration_wish"
  | "leave_request_submitted"
  | "leave_request_manager_approved"
  | "leave_request_reviewed";

export interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface ReportSchedule {
  _id: string;
  frequency: "daily" | "weekly" | "monthly";
  format: "csv" | "pdf";
  recipients: string[];
  createdBy: string;
  createdAt: string;
}

/** Free-form key matching one of `SystemSettings.announcementCategories` at
 * post time - not a fixed union, since admins can add/remove categories. */
export type AnnouncementCategory = string;

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  pinned: boolean;
  authorId: string;
  authorName: string;
  authorDesignation: string;
  acknowledgedCount: number;
  acknowledgedByMe: boolean;
  createdAt: string;
}

/** Minimal, non-sensitive employee shape returned by GET /employees/celebrations. */
export interface CelebrationEmployee {
  _id: string;
  name: string;
  designation: string;
  photoUrl: string | null;
  dateOfBirth: string | null;
  hireDate: string | null;
}

/** Free-form key matching one of `SystemSettings.leaveTypes` at request
 * time - not a fixed union, since admins can add/remove leave types. */
export type LeaveType = string;
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
/** Whose turn it is to act while `status === "pending"`. */
export type LeaveApprovalStage = "manager" | "admin" | "done";

export interface LeaveRequestEmployeeRef {
  _id: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  photoUrl: string | null;
}

export interface LeaveRequest {
  _id: string;
  // null if the referenced employee has since been deleted.
  employee: LeaveRequestEmployeeRef | null;
  type: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  // Set when an admin submitted this on the employee's behalf.
  submittedByAdmin: string | null;
  status: LeaveRequestStatus;
  approvalStage: LeaveApprovalStage;
  managerDecision: "approved" | "rejected" | null;
  managerReviewedBy: string | null;
  managerReviewedAt: string | null;
  managerNote: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/** Per-leave-type balance for the current calendar year, from
 * GET /leave-requests/balance. `remaining: null` means unlimited. */
export interface LeaveBalance {
  key: string;
  label: string;
  annualQuota: number | null;
  paid: boolean;
  used: number;
  remaining: number | null;
}

export interface AnnouncementCategoryConfig {
  key: string;
  label: string;
}

export interface LeaveTypeConfig {
  key: string;
  label: string;
  annualQuota: number | null;
  paid: boolean;
}

export interface EmploymentTypeConfig {
  key: string;
  label: string;
}

export type LeaveApprovalFlow = "admin_only" | "manager_only" | "manager_then_admin";

/** GET /settings - full shape for admins. Non-admins get the same shape
 * minus `defaultEmployeePassword` (omitted server-side, never sent). */
export interface SystemSettings {
  companyName: string;
  companyLogoUrl: string | null;
  overtimeThresholdMinutes: number;
  weekendDays: number[];
  checkInReminderStart: string;
  checkInReminderEnd: string;
  defaultEmployeePassword?: string;
  minPasswordLength: number;
  officeLocations: string[];
  departments: string[];
  employmentTypes: EmploymentTypeConfig[];
  announcementCategories: AnnouncementCategoryConfig[];
  leaveTypes: LeaveTypeConfig[];
  leaveApprovalFlow: LeaveApprovalFlow;
  updatedAt: string;
  updatedBy: string | null;
}

/** GET /settings/public - unauthenticated, branding only (used pre-login). */
export interface PublicSettings {
  companyName: string;
  companyLogoUrl: string | null;
}
