import User, { UserDocument } from "../models/User";

export const userRepository = {
  findByUsername(username: string) {
    return User.findOne({ username });
  },

  findById(id: string) {
    return User.findById(id);
  },

  findByIdLean(id: string) {
    return User.findById(id).lean<{
      username: string;
      name: string;
      role: "admin" | "staff";
      tokenVersion: number;
      mustChangePassword: boolean;
    } | null>();
  },

  create(data: Partial<UserDocument>) {
    return User.create(data);
  },

  findByIdAndUpdate(id: string, update: Record<string, unknown>) {
    return User.findByIdAndUpdate(id, update);
  },

  findByIdAndDelete(id: string) {
    return User.findByIdAndDelete(id);
  },

  incrementTokenVersion(id: string) {
    return User.findByIdAndUpdate(id, { $inc: { tokenVersion: 1 } });
  },

  findAdmins(excludeUserId?: string) {
    const filter: Record<string, unknown> = { role: "admin" };
    if (excludeUserId) filter._id = { $ne: excludeUserId };
    return User.find(filter).select("_id").lean<{ _id: unknown }[]>();
  },
};
