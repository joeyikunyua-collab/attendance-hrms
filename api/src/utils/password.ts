import bcrypt from "bcryptjs";

// Default login password assigned to every employee account created from the Employees page.
export const DEFAULT_EMPLOYEE_PASSWORD = "Welcome@123";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
