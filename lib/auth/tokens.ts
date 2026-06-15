import type { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError } from "@/lib/api/errors";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "./jwt";
import { getAuthUser } from "./user";

export async function createTokenPair(userId: string) {
  const user = await getAuthUser(userId);
  const accessToken = await signAccessToken(userId);
  const { token: refreshToken } = await signRefreshToken(userId);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: new Date(Date.now() + authConfig.refreshTokenMaxAge * 1000),
    },
  });
  return { accessToken, refreshToken, user };
}

export async function rotateRefreshToken(token: string) {
  const payload = await verifyRefreshToken(token).catch(() => { throw new UnauthorizedError("Invalid refresh token"); });
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash: hashToken(token), userId: payload.sub, revokedAt: null, deletedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!stored) throw new UnauthorizedError("Refresh token is expired or revoked");
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  return createTokenPair(payload.sub);
}

export async function revokeRefreshToken(token?: string | null) {
  if (!token) return;
  await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

export function setAuthCookies(response: NextResponse, pair: { accessToken: string; refreshToken: string }) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(authConfig.accessCookie, pair.accessToken, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: authConfig.accessTokenMaxAge });
  response.cookies.set(authConfig.refreshCookie, pair.refreshToken, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: authConfig.refreshTokenMaxAge });
  return response;
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(authConfig.accessCookie, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(authConfig.refreshCookie, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
