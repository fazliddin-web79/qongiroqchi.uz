import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError } from "@/lib/api/errors";
import type { AuthUser } from "@/types/auth";
import { PLATFORM_ROLES } from "@/lib/permissions/constants";

export async function getAuthUser(userId: string, impersonationId?: string): Promise<AuthUser> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { company: true, roles: { where: { deletedAt: null }, include: { role: { include: { permissions: true } } } } },
  });
  if (!user) throw new UnauthorizedError("User account is unavailable");
  if (user.company?.status === "SUSPENDED") throw new UnauthorizedError("Company account is suspended");
  const roles = user.roles.map(({ role }) => role.name);
  const isPlatform = roles.some((role) => PLATFORM_ROLES.includes(role as typeof PLATFORM_ROLES[number]));
  let impersonatedCompanyId: string | null = null;
  if (impersonationId) {
    if (!isPlatform) throw new UnauthorizedError("Only platform users can impersonate companies");
    const session = await prisma.impersonationSession.findFirst({
      where: { id: impersonationId, platformUserId: user.id, endedAt: null, deletedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!session) throw new UnauthorizedError("Impersonation session is unavailable");
    impersonatedCompanyId = session.companyId;
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    companyId: user.companyId,
    impersonatedCompanyId,
    isImpersonating: Boolean(impersonatedCompanyId),
    accessLevel: isPlatform ? "PLATFORM" : "COMPANY",
    roles,
    permissions: [...new Set(user.roles.flatMap(({ role }) => role.permissions.map((permission) => permission.key)))],
  };
}
