import mongoose, { Schema, models, model } from "mongoose";

export type EmployeeStatus = "pending_onboarding" | "active" | "inactive" | "suspended";
/** No longer a fixed union - validated at request time against the
 * admin-configured `settings.employmentTypes` list instead (see
 * employee.service.ts), so admins can add/remove types without a
 * migration. Old documents keep whatever key was valid when they were
 * created even if that type is later removed from Settings. */
export type EmploymentType = string;

export interface EmployeeDocument extends mongoose.Document {
  employeeId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  name: string;
  workEmail: string;
  department: string;
  designation: string;
  role: "admin" | "staff";
  user: mongoose.Types.ObjectId | null;
  /** Derived from `status` (active/pending_onboarding -> true, inactive/suspended
   * -> false) rather than independently settable, so the many existing
   * call sites that filter on `active` (login gating, attendance eligibility,
   * employee pickers) don't need to know about the richer status enum. */
  active: boolean;
  status: EmployeeStatus;
  dateOfBirth: Date | null;
  hireDate: Date | null;
  officeLocation: string;
  manager: mongoose.Types.ObjectId | null;
  employmentType: EmploymentType;
  photoUrl: string | null;
  createdAt: Date;
}

const EmployeeSchema = new Schema<EmployeeDocument>({
  employeeId: { type: String, required: true, unique: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, default: "", trim: true },
  lastName: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  workEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
  department: { type: String, default: "", trim: true },
  designation: { type: String, default: "", trim: true },
  role: { type: String, enum: ["admin", "staff"], default: "staff" },
  user: { type: Schema.Types.ObjectId, ref: "User", default: null },
  active: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ["pending_onboarding", "active", "inactive", "suspended"],
    default: "pending_onboarding",
  },
  dateOfBirth: { type: Date, default: null },
  hireDate: { type: Date, default: null },
  officeLocation: { type: String, default: "", trim: true },
  manager: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
  employmentType: { type: String, default: "full_time" },
  photoUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default models.Employee || model<EmployeeDocument>("Employee", EmployeeSchema);
