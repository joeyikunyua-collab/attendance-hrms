import * as dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable. Add it to api/.env (see api/.env.example).`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4001),
  MONGODB_URI: required("MONGODB_URI"),
  JWT_SECRET: required("JWT_SECRET"),
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
