import ReportSchedule, { ReportScheduleDocument } from "../models/ReportSchedule";

export const reportScheduleRepository = {
  create(data: Partial<ReportScheduleDocument>) {
    return ReportSchedule.create(data);
  },

  findAllSorted() {
    return ReportSchedule.find().sort({ createdAt: -1 }).lean();
  },

  findByIdAndDelete(id: string) {
    return ReportSchedule.findByIdAndDelete(id);
  },
};
