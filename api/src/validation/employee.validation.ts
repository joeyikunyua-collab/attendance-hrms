import { z } from "zod";

const REQUIRED_MSG = "First name, last name and work email are required";

export const createEmployeeSchema = z.object({
  firstName: z.string({ required_error: REQUIRED_MSG }).min(1, REQUIRED_MSG),
  lastName: z.string({ required_error: REQUIRED_MSG }).min(1, REQUIRED_MSG),
  workEmail: z.string({ required_error: REQUIRED_MSG }).min(1, REQUIRED_MSG),
  middleName: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  role: z.string().optional(),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  role: z.string().optional(),
  active: z.boolean().optional(),
});
