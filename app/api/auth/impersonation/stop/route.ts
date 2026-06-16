import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { signAccessToken } from "@/lib/auth/jwt";
import { setAccessCookie } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request);
  await prisma.impersonationSession.updateMany({ where: { platformUserId: auth.id, endedAt: null }, data: { endedAt: new Date() } });
  const accessToken = await signAccessToken(auth.id);
  await recordAudit({ action: "COMPANY_IMPERSONATE_STOP", entity: "ImpersonationSession", user: auth, request });
  return setAccessCookie(apiSuccess({ accessToken }, "Impersonation stopped"), accessToken);
});
