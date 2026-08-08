import mongoose, { Schema, models, model } from "mongoose";

export interface ReportScheduleDocument extends mongoose.Document {
  frequency: "daily" | "weekly" | "monthly";
  format: "csv" | "pdf";
  recipients: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ReportScheduleSchema = new Schema<ReportScheduleDocument>({
  frequency: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
  format: { type: String, enum: ["csv", "pdf"], required: true },
  recipients: { type: [String], required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

export default models.ReportSchedule || model<ReportScheduleDocument>("ReportSchedule", ReportScheduleSchema);
