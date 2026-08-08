import mongoose, { Schema, models, model } from "mongoose";

/** Generic atomic counter, keyed by name (e.g. "employeeId"), used for sequence generation. */
export interface CounterDocument extends Omit<mongoose.Document, "_id"> {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<CounterDocument>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export default models.Counter || model<CounterDocument>("Counter", CounterSchema);
