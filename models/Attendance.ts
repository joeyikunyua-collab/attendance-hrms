import mongoose, { Schema, models, model } from "mongoose";

export interface AttendanceDocument extends mongoose.Document {
  employee: mongoose.Types.ObjectId;
  date: string; // stored as YYYY-MM-DD for easy filtering/uniqueness per day
  checkIn: Date | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkInAccuracy: number | null;
  checkOut: Date | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutAccuracy: number | null;
  status: "present" | "late" | "absent";
  notes?: string;
  createdAt: Date;
}

const AttendanceSchema = new Schema<AttendanceDocument>({
  employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  date: { type: String, required: true },
  checkIn: { type: Date, default: null },
  checkInLatitude: { type: Number, default: null },
  checkInLongitude: { type: Number, default: null },
  checkInAccuracy: { type: Number, default: null },
  checkOut: { type: Date, default: null },
  checkOutLatitude: { type: Number, default: null },
  checkOutLongitude: { type: Number, default: null },
  checkOutAccuracy: { type: Number, default: null },
  status: { type: String, enum: ["present", "late", "absent"], default: "present" },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

// One attendance record per employee per day.
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default models.Attendance || model<AttendanceDocument>("Attendance", AttendanceSchema);
