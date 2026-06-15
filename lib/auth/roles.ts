import { RoleName } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/constants";

export async function ensurePermissions() {
  return Promise.all(PERMISSIONS.map((key) => prisma.permission.upsert({ where: { key }, update: { deletedAt: null }, create: { key } })));
}

export async function ensureRole(name: RoleName, companyId: string | null) {
  const permissions = await ensurePermissions();
  const allowed = name === RoleName.OPERATOR ? permissions.filter(({ key }) => ["leads.read", "leads.update"].includes(key)) : permissions;
  const existing = await prisma.role.findFirst({ where: { name, companyId } });
  if (existing) return prisma.role.update({ where: { id: existing.id }, data: { deletedAt: null, permissions: { set: allowed.map(({ id }) => ({ id })) } } });
  return prisma.role.create({ data: { name, companyId, permissions: { connect: allowed.map(({ id }) => ({ id })) } } });
}
