import { reportScheduleRepository } from "../repositories/reportSchedule.repository";
import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../types";

/**
 * Persists a delivery preference only - there is no cron/job runner or
 * email/SMTP integration wired up in this app, so nothing actually gets
 * sent on a schedule yet. This intentionally stops at "save the config" so
 * the UI doesn't imply email delivery is happening when it isn't.
 */
async function create(
  admin: AuthUser,
  body: { frequency: "daily" | "weekly" | "monthly"; format: "csv" | "pdf"; recipients: string[] }
) {
  if (!body.recipients || body.recipients.length === 0) {
    throw new ApiError(400, "At least one recipient email is required");
  }

  return reportScheduleRepository.create({
    frequency: body.frequency,
    format: body.format,
    recipients: body.recipients,
    createdBy: admin.id as never,
  });
}

async function list() {
  return reportScheduleRepository.findAllSorted();
}

async function remove(id: string) {
  const schedule = await reportScheduleRepository.findByIdAndDelete(id);
  if (!schedule) throw new ApiError(404, "Schedule not found");
}

export const reportScheduleService = {
  create,
  list,
  remove,
};
