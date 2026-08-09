import Employee, { EmployeeDocument } from "../models/Employee";

type PopulatedEmployee = Omit<EmployeeDocument, "manager"> & {
  manager: { _id: unknown; name: string; employeeId: string } | null;
};

export const employeeRepository = {
  findAllSorted() {
    return Employee.find()
      .sort({ name: 1 })
      .populate("manager", "name employeeId")
      .lean<PopulatedEmployee[]>();
  },

  findById(id: string) {
    return Employee.findById(id);
  },

  findByIdLean(id: string) {
    return Employee.findById(id).lean<EmployeeDocument | null>();
  },

  findByIdSelectActive(id: string) {
    return Employee.findById(id).select("active").lean<{ active: boolean } | null>();
  },

  findByUser(userId: string) {
    return Employee.findOne({ user: userId });
  },

  findByUserLean(userId: string) {
    return Employee.findOne({ user: userId }).lean<EmployeeDocument | null>();
  },

  findByUserSelectId(userId: string) {
    return Employee.findOne({ user: userId }).select("_id").lean<{ _id: unknown } | null>();
  },

  findByUserSelectIdAndManager(userId: string) {
    return Employee.findOne({ user: userId })
      .select("_id manager")
      .lean<{ _id: unknown; manager: unknown } | null>();
  },

  findByIdSelectManager(id: string) {
    return Employee.findById(id).select("manager").lean<{ manager: unknown } | null>();
  },

  /** Direct reports of a given manager - used to route leave-approval
   * queues to the right manager. */
  findByManager(managerId: string) {
    return Employee.find({ manager: managerId }).select("_id").lean<{ _id: unknown }[]>();
  },

  /** Distinct set of office locations already in use, to seed Settings the
   * first time an admin opens the Locations editor (before that, admins
   * only see whatever they've explicitly configured). */
  distinctOfficeLocations() {
    return Employee.distinct("officeLocation", { officeLocation: { $ne: "" } });
  },

  /** Flips an employee out of "pending onboarding" once they've actually
   * set their own password - a no-op if they'd already been moved to some
   * other status (e.g. an admin suspended them before they ever logged in),
   * so this can never accidentally undo a deliberate admin override. */
  completeOnboardingForUser(userId: string) {
    return Employee.updateOne({ user: userId, status: "pending_onboarding" }, { $set: { status: "active" } });
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

  /** Un-sets `manager` on anyone who reported to this (now-deleted) employee,
   * so the directory/drawer never has to deal with a manager ref pointing at
   * nothing. Populate would just silently return null for it either way,
   * but leaving the dangling id around is bad hygiene. */
  clearManagerReferences(employeeId: string) {
    return Employee.updateMany({ manager: employeeId }, { $set: { manager: null } });
  },

  /** Minimal, non-sensitive fields for the celebrations widget - every
   * employee can see this (unlike the full directory, which is admin-only),
   * so it deliberately excludes email, role, manager, etc. */
  findCelebrationFields() {
    return Employee.find({ active: true })
      .select("_id name designation photoUrl dateOfBirth hireDate")
      .lean<
        {
          _id: unknown;
          name: string;
          designation: string;
          photoUrl: string | null;
          dateOfBirth: Date | null;
          hireDate: Date | null;
        }[]
      >();
  },
};
