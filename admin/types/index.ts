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
  active: boolean;
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
  checkOut: string | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutAccuracy: number | null;
  status: AttendanceStatus;
  notes?: string;
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
  | "checkin_reminder";

export interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
