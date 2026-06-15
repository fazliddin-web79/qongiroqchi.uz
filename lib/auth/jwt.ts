import { createHash, randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { authConfig } from "@/auth.config";
import type { AccessTokenPayload, RefreshTokenPayload } from "@/types/auth";

function getAccessSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "development-secret-change-me");
}

function getRefreshSecret() {
  return new TextEncoder().encode(process.env.REFRESH_TOKEN_SECRET ?? process.env.AUTH_SECRET ?? "development-refresh-secret-change-me");
}

export async function signAccessToken(userId: string) {
  return new SignJWT({ type: "access" }).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuedAt().setExpirationTime(authConfig.accessTokenLifetime).sign(getAccessSecret());
}

export async function signRefreshToken(userId: string, jti = randomUUID()) {
  const token = await new SignJWT({ type: "refresh" }).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setJti(jti).setIssuedAt().setExpirationTime(authConfig.refreshTokenLifetime).sign(getRefreshSecret());
  return { token, jti };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getAccessSecret());
  if (payload.type !== "access" || !payload.sub) throw new Error("Invalid access token");
  return { sub: payload.sub, type: "access" };
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, getRefreshSecret());
  if (payload.type !== "refresh" || !payload.sub || !payload.jti) throw new Error("Invalid refresh token");
  return { sub: payload.sub, jti: payload.jti, type: "refresh" };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
