import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfig } from "@/auth.config";
import { verifyAccessToken } from "./jwt";
import type { AuthSession } from "@/types/auth";
import { getAuthUser } from "./user";

const demoSession: AuthSession = {
  user: { id: "demo-user", name: "Demo Admin", email: "admin@example.com", accessLevel: "PLATFORM", roles: ["SUPER_ADMIN"], permissions: ["*"] },
  expiresAt: "2099-01-01T00:00:00.000Z",
};

export async function getSession(): Promise<AuthSession | null> {
  if (process.env.AUTH_ENFORCED !== "true") return demoSession;
  const token = (await cookies()).get(authConfig.accessCookie)?.value;
  if (!token) return null;
  try {
    const payload = await verifyAccessToken(token);
    return { user: await getAuthUser(payload.sub, payload.impersonationId), expiresAt: new Date(Date.now() + authConfig.accessTokenMaxAge * 1000).toISOString() };
  } catch { return null; }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect(authConfig.loginRoute);
  return session;
}
