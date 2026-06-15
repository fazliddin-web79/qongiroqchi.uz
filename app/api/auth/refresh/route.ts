import { authConfig } from "@/auth.config";
import { UnauthorizedError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { rotateRefreshToken, setAuthCookies } from "@/lib/auth/tokens";
import { recordAudit } from "@/lib/logging/audit-log";

export const POST = withApiHandler(async (request) => {
  const body = await request.json().catch(() => ({})) as { refreshToken?: string };
  const token = body.refreshToken ?? request.cookies.get(authConfig.refreshCookie)?.value;
  if (!token) throw new UnauthorizedError("Refresh token is required");
  const pair = await rotateRefreshToken(token);
  await recordAudit({ action: "AUTH_REFRESH", entity: "User", entityId: pair.user.id, user: pair.user, request });
  return setAuthCookies(apiSuccess({ user: pair.user, accessToken: pair.accessToken }, "Token refreshed"), pair);
});
