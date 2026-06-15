import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyIdForWrite } from "@/lib/modules/scope";
import { ROLES } from "@/lib/permissions/constants";
import { sendTelegramTest } from "@/lib/telegram/service";
import { z } from "zod";

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  const input = z.object({ companyId: z.uuid().optional() }).parse(await request.json().catch(() => ({})));
  const companyId = companyIdForWrite(auth, input.companyId);
  await sendTelegramTest(companyId);
  await recordAudit({ action: "TELEGRAM_TEST", entity: "CompanySetting", user: auth, request, metadata: { companyId } });
  return apiSuccess({}, "Telegram test message sent");
});
