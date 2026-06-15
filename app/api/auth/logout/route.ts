import { authConfig } from "@/auth.config";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { getOptionalApiUser } from "@/lib/auth/api";
import { clearAuthCookies, revokeRefreshToken } from "@/lib/auth/tokens";
import { recordAudit } from "@/lib/logging/audit-log";

export const POST = withApiHandler(async (request) => {
  const body = await request.json().catch(() => ({})) as { refreshToken?: string };
  const user = await getOptionalApiUser(request);
  await revokeRefreshToken(body.refreshToken ?? request.cookies.get(authConfig.refreshCookie)?.value);
  await recordAudit({ action: "AUTH_LOGOUT", entity: "User", entityId: user?.id, user, request });
  return clearAuthCookies(apiSuccess({}, "Logout successful"));
});
