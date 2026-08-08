import mongoose, { Schema, models, model } from "mongoose";

export interface AttendanceDocument extends mongoose.Document {
  employee: mongoose.Types.ObjectId;
  date: string; // stored as YYYY-MM-DD for easy filtering/uniqueness per day
  checkIn: Date | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkInAccuracy: number | null;
  checkInIp: string | null;
  checkOut: Date | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutAccuracy: number | null;
  checkOutIp: string | null;
  status: "present" | "late" | "absent";
  notes?: string;
  /** Admin audit trail for exception review - separate from `notes` (which
   * is a general free-text field on the record itself), this is specifically
   * the note left when acknowledging/resolving an exception-queue entry. */
  auditNote: string | null;
  resolvedAt: Date | null;
  resolvedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const AttendanceSchema = new Schema<AttendanceDocument>({
  employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  date: { type: String, required: true },
  checkIn: { type: Date, default: null },
  checkInLatitude: { type: Number, default: null },
  checkInLongitude: { type: Number, default: null },
  checkInAccuracy: { type: Number, default: null },
  checkInIp: { type: String, default: null },
  checkOut: { type: Date, default: null },
  checkOutLatitude: { type: Number, default: null },
  checkOutLongitude: { type: Number, default: null },
  checkOutAccuracy: { type: Number, default: null },
  checkOutIp: { type: String, default: null },
  status: { type: String, enum: ["present", "late", "absent"], default: "present" },
  notes: { type: String, default: "" },
  auditNote: { type: String, default: null },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  createdAt: { type: Date, default: Date.now },
});

// One attendance record per employee per day.
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default models.Attendance || model<AttendanceDocument>("Attendance", AttendanceSchema);
