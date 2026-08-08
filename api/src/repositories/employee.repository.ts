import Employee, { EmployeeDocument } from "../models/Employee";

export const employeeRepository = {
  findAllSorted() {
    return Employee.find().sort({ name: 1 }).lean();
  },

  findById(id: string) {
    return Employee.findById(id);
  },

  findByIdLean(id: string) {
    return Employee.findById(id).lean();
  },

  findByIdSelectActive(id: string) {
    return Employee.findById(id).select("active").lean<{ active: boolean } | null>();
  },

  findByUser(userId: string) {
    return Employee.findOne({ user: userId });
  },

  findByUserLean(userId: string) {
    return Employee.findOne({ user: userId }).lean();
  },

  findByUserSelectId(userId: string) {
    return Employee.findOne({ user: userId }).select("_id").lean<{ _id: unknown } | null>();
  },

  findByWorkEmail(workEmail: string) {
    return Employee.findOne({ workEmail }).select("_id").lean();
  },

  findIdsMatchingPrefix() {
    return Employee.find({ employeeId: /^EMP\d+$/ })
      .select("employeeId")
      .lean<{ employeeId: string }[]>();
  },

  create(data: Partial<EmployeeDocument>) {
    return Employee.create(data);
  },

  findByIdAndDelete(id: string) {
    return Employee.findByIdAndDelete(id);
  },
};
