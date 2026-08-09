import mongoose, { Schema, models, model } from "mongoose";

export interface NotificationDocument extends mongoose.Document {
  recipient: mongoose.Types.ObjectId;
  type:
    | "employee_created"
    | "password_changed"
    | "checked_in"
    | "checked_out"
    | "checkin_reminder"
    | "announcement_posted"
    | "celebration_wish"
    | "leave_request_submitted"
    | "leave_request_manager_approved"
    | "leave_request_reviewed";
  title: string;
  body: string;
  read: boolean;
  /** Only set by checkin_reminder notifications, to prevent duplicate
   * reminders for the same person/day/half-hour slot. */
  dedupeKey?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<NotificationDocument>({
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: [
      "employee_created",
      "password_changed",
      "checked_in",
      "checked_out",
      "checkin_reminder",
      "announcement_posted",
      "celebration_wish",
      "leave_request_submitted",
      "leave_request_manager_approved",
      "leave_request_reviewed",
    ],
    required: true,
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  read: { type: Boolean, default: false },
  dedupeKey: { type: String },
  createdAt: { type: Date, default: Date.now },
});

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1 });
NotificationSchema.index({ recipient: 1, dedupeKey: 1 });

export default models.Notification || model<NotificationDocument>("Notification", NotificationSchema);
