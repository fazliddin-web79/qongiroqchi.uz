import { Prisma } from "@prisma/client";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyIdForWrite } from "@/lib/modules/scope";
import { PERMISSION } from "@/lib/permissions/constants";
import { getCompanySettings } from "@/lib/settings/service";

const workingHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  days: z.array(z.number().int().min(0).max(6)).max(7),
});
const schema = z.object({
  companyId: z.uuid().optional(),
  telegramBotToken: z.string().trim().max(255).nullable().optional(),
  telegramChatId: z.string().trim().max(120).nullable().optional(),
  defaultRetryCount: z.number().int().min(0).max(10).optional(),
  workingHours: workingHoursSchema.optional(),
  callSpeedLimit: z.number().int().min(1).max(10_000).optional(),
  dailyCallLimit: z.number().int().min(1).max(1_000_000).optional(),
  concurrentCallLimit: z.number().int().min(1).max(1_000).optional(),
  retryFailed: z.boolean().optional(),
  retryBusy: z.boolean().optional(),
  retryUnanswered: z.boolean().optional(),
  defaultLanguage: z.enum(["uz", "en", "ru"]).optional(),
  timezone: z.string().trim().min(2).max(100).refine((value) => {
    try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; } catch { return false; }
  }, "Invalid timezone").optional(),
});

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.SETTINGS_UPDATE);
  const companyId = companyIdForWrite(auth, request.nextUrl.searchParams.get("companyId"));
  return apiSuccess(await getCompanySettings(companyId));
});

export const PATCH = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.SETTINGS_UPDATE);
  const input = schema.parse(await request.json());
  const companyId = companyIdForWrite(auth, input.companyId);
  await getCompanySettings(companyId);
  const settings = await prisma.companySetting.update({
    where: { companyId },
    data: {
      telegramBotToken: input.telegramBotToken === "" ? null : input.telegramBotToken,
      telegramChatId: input.telegramChatId === "" ? null : input.telegramChatId,
      defaultRetryCount: input.defaultRetryCount,
      workingHours: input.workingHours as Prisma.InputJsonValue | undefined,
      callSpeedLimit: input.callSpeedLimit,
      dailyCallLimit: input.dailyCallLimit,
      concurrentCallLimit: input.concurrentCallLimit,
      retryFailed: input.retryFailed,
      retryBusy: input.retryBusy,
      retryUnanswered: input.retryUnanswered,
      defaultLanguage: input.defaultLanguage,
      timezone: input.timezone,
    },
  });
  await recordAudit({ action: "COMPANY_SETTINGS_UPDATE", entity: "CompanySetting", entityId: settings.id, user: auth, request });
  return apiSuccess(settings, "Company settings updated");
});
