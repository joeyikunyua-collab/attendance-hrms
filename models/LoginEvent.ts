import mongoose, { Schema, models, model } from "mongoose";

export interface LoginEventDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  username: string;
  name: string;
  role: "admin" | "staff";
  loggedInAt: Date;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  locationError: string | null;
}

const LoginEventSchema = new Schema<LoginEventDocument>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["admin", "staff"], required: true },
  loggedInAt: { type: Date, default: Date.now },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  accuracy: { type: Number, default: null },
  locationError: { type: String, default: null },
});

export default models.LoginEvent || model<LoginEventDocument>("LoginEvent", LoginEventSchema);
