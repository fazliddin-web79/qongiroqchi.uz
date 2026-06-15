import { RoleName } from "@prisma/client";
import { z } from "zod";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhere, isSuperAdmin } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ description: z.string().max(300).nullable().optional(), permissionIds: z.array(z.uuid()).optional() });

export const GET = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]); const { id } = await params;
  const role = await prisma.role.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) }, include: { permissions: true, _count: { select: { users: true } } } });
  if (!role) throw new NotFoundError("Role"); return apiSuccess(role);
});
export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]); const { id } = await params;
  const existing = await prisma.role.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } });
  if (!existing) throw new NotFoundError("Role");
  if (!isSuperAdmin(auth) && existing.name === RoleName.SUPER_ADMIN) throw new ForbiddenError();
  const input = schema.parse(await request.json());
  const role = await prisma.role.update({ where: { id }, data: { description: input.description, permissions: input.permissionIds ? { set: input.permissionIds.map((permissionId) => ({ id: permissionId })) } : undefined }, include: { permissions: true } });
  await recordAudit({ action: "ROLE_UPDATE", entity: "Role", entityId: id, user: auth, request }); return apiSuccess(role, "Role updated");
});
export const DELETE = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]); const { id } = await params;
  const role = await prisma.role.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } });
  if (!role) throw new NotFoundError("Role");
  if (role.name === RoleName.SUPER_ADMIN) throw new ForbiddenError("SUPER_ADMIN role cannot be deleted");
  await prisma.role.update({ where: { id }, data: { deletedAt: new Date() } });
  await prisma.userRole.updateMany({ where: { roleId: id, deletedAt: null }, data: { deletedAt: new Date() } });
  await recordAudit({ action: "ROLE_DELETE", entity: "Role", entityId: id, user: auth, request }); return apiSuccess({}, "Role deleted");
});
