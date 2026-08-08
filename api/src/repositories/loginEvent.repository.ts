import LoginEvent, { LoginEventDocument } from "../models/LoginEvent";

export const loginEventRepository = {
  create(data: Partial<LoginEventDocument>) {
    return LoginEvent.create(data);
  },

  findById(id: string) {
    return LoginEvent.findById(id);
  },

  findAllSorted(limit: number) {
    return LoginEvent.find().sort({ loggedInAt: -1 }).limit(limit).lean();
  },
};
