/**
 * One-time script to create the first login user.
 * Run with: npm run seed:admin
 * Reads SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME from .env.local
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

async function main() {
  const uri = process.env.MONGODB_URI;
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator";

  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local first.");
  }

  await mongoose.connect(uri);

  const existing = await User.findOne({ username: username.toLowerCase() });
  if (existing) {
    console.log(`User "${username}" already exists. Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ username: username.toLowerCase(), passwordHash, name, role: "admin" });

  console.log(`Created admin user "${username}" with the password from .env.local.`);
  console.log("You can now log in at /login with these credentials.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
