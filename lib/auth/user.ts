import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError } from "@/lib/api/errors";
import type { AuthUser } from "@/types/auth";

export async function getAuthUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { roles: { where: { deletedAt: null }, include: { role: { include: { permissions: true } } } } },
  });
  if (!user) throw new UnauthorizedError("User account is unavailable");
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    companyId: user.companyId,
    roles: user.roles.map(({ role }) => role.name),
    permissions: [...new Set(user.roles.flatMap(({ role }) => role.permissions.map((permission) => permission.key)))],
  };
}
