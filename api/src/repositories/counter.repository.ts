import Counter from "../models/Counter";

export const counterRepository = {
  /** Atomically bumps `_id`'s sequence to one past whichever is larger: its
   * current value, or `floor` (the caller-supplied self-heal baseline). */
  incrementAtLeast(id: string, floor: number) {
    return Counter.findOneAndUpdate(
      { _id: id },
      [{ $set: { seq: { $add: [{ $max: [{ $ifNull: ["$seq", 0] }, floor] }, 1] } } }],
      { new: true, upsert: true }
    );
  },
};
