import mongoose, { Schema, models, model } from "mongoose";

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
  active: boolean;
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
  createdAt: { type: Date, default: Date.now },
});

export default models.Employee || model<EmployeeDocument>("Employee", EmployeeSchema);
