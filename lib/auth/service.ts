import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfig } from "@/auth.config";
import { verifySessionToken } from "./jwt";
import type { AuthSession } from "@/types/auth";

const demoSession: AuthSession = {
  user: { id: "demo-user", name: "Demo Admin", email: "admin@example.com", roles: ["admin"], permissions: ["*"] },
  expiresAt: "2099-01-01T00:00:00.000Z",
};

export async function getSession(): Promise<AuthSession | null> {
  if (process.env.AUTH_ENFORCED !== "true") return demoSession;
  const token = (await cookies()).get(authConfig.sessionCookie)?.value;
  if (!token) return null;
  try { return await verifySessionToken(token); } catch { return null; }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect(authConfig.loginRoute);
  return session;
}
