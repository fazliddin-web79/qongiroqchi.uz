import type { NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { UnauthorizedError } from "@/lib/api/errors";
import { assertAnyPermission, assertPermission, assertRole } from "@/lib/permissions";
import { verifyAccessToken } from "./jwt";
import { getAuthUser } from "./user";

export async function requireApiAuth(request: NextRequest, roles?: string[]) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = bearer || request.cookies.get(authConfig.accessCookie)?.value;
  if (!token) throw new UnauthorizedError();
  const payload = await verifyAccessToken(token).catch(() => { throw new UnauthorizedError("Invalid or expired access token"); });
  const user = await getAuthUser(payload.sub, payload.impersonationId);
  if (roles) assertRole(user, roles);
  return user;
}

export async function requireApiPermission(request: NextRequest, permission: string, roles?: string[]) {
  const user = await requireApiAuth(request, roles);
  assertPermission(user, permission);
  return user;
}

export async function requireAnyApiPermission(request: NextRequest, permissions: string[], roles?: string[]) {
  const user = await requireApiAuth(request, roles);
  assertAnyPermission(user, permissions);
  return user;
}

export async function getOptionalApiUser(request: NextRequest) {
  try {
    return await requireApiAuth(request);
  } catch {
    return null;
  }
}
