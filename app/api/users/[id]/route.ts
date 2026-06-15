import { RoleName } from "@prisma/client";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { requireAnyApiPermission, requireApiPermission } from "@/lib/auth/api";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhere, isSuperAdmin } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const updateSchema = z.object({ name: z.string().min(2).max(120).optional(), email: z.email().transform((value) => value.toLowerCase()).optional(), password: z.string().min(8).max(128).optional(), roleId: z.uuid().optional() });

export const GET = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireAnyApiPermission(request, [PERMISSION.USER_CREATE, PERMISSION.USER_INVITE, PERMISSION.USER_UPDATE, PERMISSION.USER_DELETE]);
  const { id } = await params;
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) }, select: { id: true, name: true, email: true, companyId: true, createdAt: true, updatedAt: true, roles: { where: { deletedAt: null }, select: { role: { select: { id: true, name: true } } } } } });
  if (!user) throw new NotFoundError("User");
  return apiSuccess(user);
});

export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.USER_UPDATE);
  const { id } = await params;
  const input = updateSchema.parse(await request.json());
  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } });
  if (!existing) throw new NotFoundError("User");
  if (input.roleId) {
    const role = await prisma.role.findFirst({ where: { id: input.roleId, deletedAt: null, companyId: existing.companyId } });
    if (!role || (!isSuperAdmin(auth) && role.name === RoleName.SUPER_ADMIN)) throw new ForbiddenError("Invalid role assignment");
    await prisma.userRole.updateMany({ where: { userId: id, deletedAt: null }, data: { deletedAt: new Date() } });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: id, roleId: role.id } }, update: { deletedAt: null }, create: { userId: id, roleId: role.id } });
  }
  const user = await prisma.user.update({ where: { id }, data: { name: input.name, email: input.email, passwordHash: input.password ? await hashPassword(input.password) : undefined }, select: { id: true, name: true, email: true, companyId: true, updatedAt: true } });
  await recordAudit({ action: "USER_UPDATE", entity: "User", entityId: id, user: auth, request });
  return apiSuccess(user, "User updated");
});

export const DELETE = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.USER_DELETE);
  const { id } = await params;
  if (id === auth.id) throw new ForbiddenError("You cannot delete your own account");
  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } });
  if (!existing) throw new NotFoundError("User");
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await recordAudit({ action: "USER_DELETE", entity: "User", entityId: id, user: auth, request });
  return apiSuccess({}, "User deleted");
});
