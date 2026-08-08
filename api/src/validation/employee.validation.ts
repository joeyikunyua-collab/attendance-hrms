import { z } from "zod";

const REQUIRED_MSG = "First name, last name and work email are required";
const ORG_REQUIRED_MSG = "Hire date and office location are required";

const employmentTypeSchema = z.enum(["full_time", "part_time", "contract", "intern"]);
const employeeStatusSchema = z.enum(["pending_onboarding", "active", "inactive", "suspended"]);

export const createEmployeeSchema = z.object({
  firstName: z.string({ required_error: REQUIRED_MSG }).min(1, REQUIRED_MSG),
  lastName: z.string({ required_error: REQUIRED_MSG }).min(1, REQUIRED_MSG),
  workEmail: z.string({ required_error: REQUIRED_MSG }).min(1, REQUIRED_MSG),
  middleName: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  role: z.string().optional(),
  dateOfBirth: z.string().nullable().optional(),
  hireDate: z.string({ required_error: ORG_REQUIRED_MSG }).min(1, ORG_REQUIRED_MSG),
  officeLocation: z.string({ required_error: ORG_REQUIRED_MSG }).min(1, ORG_REQUIRED_MSG),
  manager: z.string().nullable().optional(),
  employmentType: employmentTypeSchema.optional(),
  photoUrl: z.string().nullable().optional(),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  role: z.string().optional(),
  active: z.boolean().optional(),
  status: employeeStatusSchema.optional(),
  dateOfBirth: z.string().nullable().optional(),
  hireDate: z.string().nullable().optional(),
  officeLocation: z.string().optional(),
  manager: z.string().nullable().optional(),
  employmentType: employmentTypeSchema.optional(),
  photoUrl: z.string().nullable().optional(),
});
