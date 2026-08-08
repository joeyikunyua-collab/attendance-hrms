import mongoose from "mongoose";
import { env } from "./env";

export async function connectToDatabase(): Promise<typeof mongoose> {
  return mongoose.connect(env.MONGODB_URI, { bufferCommands: false });
}
