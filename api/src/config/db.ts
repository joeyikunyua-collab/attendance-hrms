import dns from "dns";
import mongoose from "mongoose";
import { env } from "./env";

// Some Windows setups (VPN/virtual network adapters, in particular) hand
// Node a DNS server it can't reach for SRV lookups specifically, even
// though the OS's own resolver works fine - which breaks mongodb+srv://
// connection strings with `querySrv ECONNREFUSED`. Dev-only workaround:
// point Node's resolver at a public DNS server instead. Never do this in
// production, where the platform's own DNS/VPC resolver should be trusted.
if (env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  return mongoose.connect(env.MONGODB_URI, { bufferCommands: false });
}
