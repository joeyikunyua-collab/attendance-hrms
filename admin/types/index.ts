export type EmployeeStatus = "pending_onboarding" | "active" | "inactive" | "suspended";
export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";

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
  | "celebration_wish";

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

export type AnnouncementCategory = "company_update" | "policy" | "event";

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  pinned: boolean;
  authorId: string;
  authorName: string;
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
