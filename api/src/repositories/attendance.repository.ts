import Attendance, { AttendanceDocument } from "../models/Attendance";

export const attendanceRepository = {
  find(filter: Record<string, unknown>, opts: { skip?: number; limit?: number }) {
    let query = Attendance.find(filter).populate("employee").sort({ date: -1, createdAt: -1 });
    if (typeof opts.skip === "number") query = query.skip(opts.skip);
    if (typeof opts.limit === "number") query = query.limit(opts.limit);
    return query.lean();
  },

  count(filter: Record<string, unknown>) {
    return Attendance.countDocuments(filter);
  },

  create(data: Partial<AttendanceDocument>) {
    return Attendance.create(data);
  },

  findById(id: string) {
    return Attendance.findById(id).populate("employee");
  },

  findByIdAndDelete(id: string) {
    return Attendance.findByIdAndDelete(id);
  },

  findOneByEmployeeAndDate(employeeId: unknown, date: string) {
    return Attendance.findOne({ employee: employeeId, date })
      .select("checkIn")
      .lean<{ checkIn: Date | null } | null>();
  },

  /** Creates or overwrites the one record for this employee/date - used by
   * the admin "manual time entry" tool, which corrects/backfills a specific
   * day rather than recording a live check-in/out. */
  upsertManual(employeeId: string, date: string, fields: Partial<AttendanceDocument>) {
    return Attendance.findOneAndUpdate(
      { employee: employeeId, date },
      { $set: { employee: employeeId, date, ...fields } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("employee");
  },
};
