import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const DEFAULT_WORKING_HOURS = { enabled: false, start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5] };

export async function getCompanySettings(companyId: string) {
  return prisma.companySetting.upsert({
    where: { companyId },
    update: { deletedAt: null },
    create: { companyId },
  });
}

export function parseWorkingHours(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_WORKING_HOURS;
  const data = value as Record<string, unknown>;
  return {
    enabled: data.enabled === true,
    start: typeof data.start === "string" ? data.start : DEFAULT_WORKING_HOURS.start,
    end: typeof data.end === "string" ? data.end : DEFAULT_WORKING_HOURS.end,
    days: Array.isArray(data.days) ? data.days.filter((day): day is number => typeof day === "number") : DEFAULT_WORKING_HOURS.days,
  };
}
