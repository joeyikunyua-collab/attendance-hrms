import mongoose, { Schema, models, model } from "mongoose";

export interface UserDocument extends mongoose.Document {
  username: string;
  passwordHash: string;
  name: string;
  role: "admin" | "staff";
  employee: mongoose.Types.ObjectId | null;
  /** Bumped to invalidate every previously issued session token (e.g. on deactivation). */
  tokenVersion: number;
  /** True until the user sets their own password (forced on accounts created with the shared default password). */
  mustChangePassword: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<UserDocument>({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["admin", "staff"], default: "staff" },
  employee: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
  tokenVersion: { type: Number, default: 0 },
  mustChangePassword: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default models.User || model<UserDocument>("User", UserSchema);
