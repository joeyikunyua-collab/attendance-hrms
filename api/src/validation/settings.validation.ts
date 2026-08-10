import { z } from "zod";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const announcementCategorySchema = z.object({
  key: z.string().optional(),
  label: z.string().min(1, "Category name can't be empty"),
});

const leaveTypeSchema = z.object({
  key: z.string().optional(),
  label: z.string().min(1, "Leave type name can't be empty"),
  annualQuota: z.number().int().min(0, "Must be 0 or more").nullable(),
  paid: z.boolean(),
});

const employmentTypeSchema = z.object({
  key: z.string().optional(),
  label: z.string().min(1, "Employment type name can't be empty"),
});

export const updateSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name can't be empty").optional(),
  companyLogoUrl: z.string().nullable().optional(),
  overtimeThresholdMinutes: z.number().int().min(1, "Must be at least 1 minute").optional(),
  weekendDays: z.array(z.number().int().min(0).max(6)).optional(),
  checkInReminderStart: z.string().regex(TIME_RE, "Use 24h HH:MM format").optional(),
  checkInReminderEnd: z.string().regex(TIME_RE, "Use 24h HH:MM format").optional(),
  defaultEmployeePassword: z.string().min(4, "Must be at least 4 characters").optional(),
  minPasswordLength: z.number().int().min(4, "Must be at least 4").max(128, "Must be at most 128").optional(),
  officeLocations: z.array(z.string().min(1)).optional(),
  departments: z.array(z.string().min(1)).optional(),
  employmentTypes: z.array(employmentTypeSchema).min(1, "At least one employment type is required").optional(),
  announcementCategories: z.array(announcementCategorySchema).min(1, "At least one category is required").optional(),
  leaveTypes: z.array(leaveTypeSchema).min(1, "At least one leave type is required").optional(),
  leaveApprovalFlow: z.enum(["admin_only", "manager_only", "manager_then_admin"]).optional(),
});
