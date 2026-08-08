import mongoose, { Schema, models, model } from "mongoose";

export type AnnouncementCategory = "company_update" | "policy" | "event";

export interface AnnouncementDocument extends mongoose.Document {
  title: string;
  body: string;
  category: AnnouncementCategory;
  pinned: boolean;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  createdAt: Date;
}

const AnnouncementSchema = new Schema<AnnouncementDocument>({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  category: { type: String, enum: ["company_update", "policy", "event"], default: "company_update" },
  pinned: { type: Boolean, default: false },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  authorName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Pinned posts first, then newest first.
AnnouncementSchema.index({ pinned: -1, createdAt: -1 });

export default models.Announcement || model<AnnouncementDocument>("Announcement", AnnouncementSchema);
