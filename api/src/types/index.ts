export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: "admin" | "staff";
  mustChangePassword?: boolean;
}

export type NotificationType =
  | "employee_created"
  | "password_changed"
  | "checked_in"
  | "checked_out"
  | "checkin_reminder";
