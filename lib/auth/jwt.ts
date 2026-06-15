import { jwtVerify, SignJWT } from "jose";
import type { AuthSession } from "@/types/auth";

function getSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "development-secret-change-me");
}

export async function signSessionToken(session: AuthSession) {
  return new SignJWT({ session }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(getSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload.session as AuthSession;
}
