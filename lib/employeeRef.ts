import type { Employee } from "@/types";

type EmployeeRef = Employee | string | null | undefined;

/** The employee's _id whether the field came back populated, as a raw id string, or null (deleted). */
export function employeeRefId(employee: EmployeeRef): string | null {
  if (!employee) return null;
  return typeof employee === "string" ? employee : employee._id;
}

/** A display name that's safe even if the referenced employee has since been deleted. */
export function employeeRefName(employee: EmployeeRef): string {
  if (!employee) return "Deleted employee";
  return typeof employee === "string" ? employee : employee.name;
}
