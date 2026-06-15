import type { NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { UnauthorizedError } from "@/lib/api/errors";
import { assertRole } from "@/lib/permissions";
import { verifyAccessToken } from "./jwt";
import { getAuthUser } from "./user";

export async function requireApiAuth(request: NextRequest, roles?: string[]) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = bearer || request.cookies.get(authConfig.accessCookie)?.value;
  if (!token) throw new UnauthorizedError();
  const payload = await verifyAccessToken(token).catch(() => { throw new UnauthorizedError("Invalid or expired access token"); });
  const user = await getAuthUser(payload.sub);
  if (roles) assertRole(user, roles);
  return user;
}

export async function getOptionalApiUser(request: NextRequest) {
  try {
    return await requireApiAuth(request);
  } catch {
    return null;
  }
}
