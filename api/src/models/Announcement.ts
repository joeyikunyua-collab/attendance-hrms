import mongoose, { Schema, models, model } from "mongoose";

/** No longer a fixed union - validated at post time against the
 * admin-configured `settings.announcementCategories` list instead (see
 * announcement.service.ts). */
export type AnnouncementCategory = string;

export interface AnnouncementDocument extends mongoose.Document {
  title: string;
  body: string;
  category: AnnouncementCategory;
  pinned: boolean;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  /** Snapshotted at post time (like authorName) - either the poster's
   * employee designation, or a role label ("Administrator") if they have no
   * linked employee record. */
  authorDesignation: string;
  /** Users who've hit "Acknowledge" on this post. */
  acknowledgedBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const AnnouncementSchema = new Schema<AnnouncementDocument>({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  category: { type: String, default: "company_update" },
  pinned: { type: Boolean, default: false },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  authorName: { type: String, required: true },
  authorDesignation: { type: String, default: "" },
  acknowledgedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

// Pinned posts first, then newest first.
AnnouncementSchema.index({ pinned: -1, createdAt: -1 });

export default models.Announcement || model<AnnouncementDocument>("Announcement", AnnouncementSchema);
