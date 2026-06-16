import { CampaignStatus } from "@prisma/client";
import { z } from "zod";
import { AppError } from "@/lib/api/errors";

const baseSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  audioAssetId: z.uuid().nullable().optional(),
  contactGroupId: z.uuid(),
  startTime: z.string().trim().nullable().optional(),
  retryEnabled: z.boolean().default(false),
  retryCount: z.number().int().min(0).max(10).default(0),
  ivrSettings: z.record(z.string(), z.unknown()).default({}),
  companyId: z.uuid().optional(),
});

export const createCampaignSchema = baseSchema;
export const updateCampaignSchema = baseSchema.omit({ companyId: true }).partial();

export function parseStartTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError("Scheduled time is invalid", 422, "INVALID_START_TIME");
  return date;
}

export function assertCampaignSchedule(status: CampaignStatus, startTime: Date | null) {
  if (status === CampaignStatus.SCHEDULED && !startTime) {
    throw new AppError("Scheduled campaigns require a start time", 422, "START_TIME_REQUIRED");
  }
}
