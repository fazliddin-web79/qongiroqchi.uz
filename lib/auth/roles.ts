import { Prisma, RoleName } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { COMPANY_ROLES, PERMISSIONS, ROLE_PERMISSION_KEYS } from "@/lib/permissions/constants";

export async function ensurePermissions() {
  return Promise.all(PERMISSIONS.map((key) => prisma.permission.upsert({ where: { key }, update: { deletedAt: null }, create: { key } })));
}

export async function ensureRole(name: RoleName, companyId: string | null) {
  const permissions = await ensurePermissions();
  const allowedKeys = new Set(ROLE_PERMISSION_KEYS[name] ?? []);
  const allowed = permissions.filter(({ key }) => allowedKeys.has(key));
  const existing = await prisma.role.findFirst({ where: { name, companyId } });
  if (existing) return prisma.role.update({ where: { id: existing.id }, data: { deletedAt: null, permissions: { set: allowed.map(({ id }) => ({ id })) } } });
  return prisma.role.create({ data: { name, companyId, permissions: { connect: allowed.map(({ id }) => ({ id })) } } });
}

export async function ensureDefaultCompanyRoles(db: Prisma.TransactionClient, companyId: string) {
  const permissions = await Promise.all(PERMISSIONS.map((key) => db.permission.upsert({ where: { key }, update: { deletedAt: null }, create: { key } })));
  const roles = [];
  for (const value of COMPANY_ROLES) {
    const name = value as RoleName;
    const allowedKeys = new Set(ROLE_PERMISSION_KEYS[name] ?? []);
    const allowed = permissions.filter(({ key }) => allowedKeys.has(key));
    const existing = await db.role.findFirst({ where: { name, companyId } });
    roles.push(existing
      ? await db.role.update({ where: { id: existing.id }, data: { deletedAt: null, permissions: { set: allowed.map(({ id }) => ({ id })) } } })
      : await db.role.create({ data: { name, companyId, permissions: { connect: allowed.map(({ id }) => ({ id })) } } }));
  }
  return roles;
}
