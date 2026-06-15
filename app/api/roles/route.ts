import { RoleName } from "@prisma/client";
import { z } from "zod";
import { ForbiddenError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhere, isSuperAdmin } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions/constants";

const schema = z.object({ name: z.nativeEnum(RoleName), description: z.string().max(300).optional(), companyId: z.uuid().optional(), permissionIds: z.array(z.uuid()).default([]) });

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  const roles = await prisma.role.findMany({ where: { deletedAt: null, ...companyWhere(auth) }, orderBy: { createdAt: "desc" }, include: { permissions: { where: { deletedAt: null }, select: { id: true, key: true } }, _count: { select: { users: true } } } });
  return apiSuccess(roles);
});

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  const input = schema.parse(await request.json());
  if (!isSuperAdmin(auth) && input.name === RoleName.SUPER_ADMIN) throw new ForbiddenError();
  const companyId = isSuperAdmin(auth) ? input.companyId ?? null : auth.companyId ?? null;
  if (input.name !== RoleName.SUPER_ADMIN && !companyId) throw new ForbiddenError("Company role requires a company");
  const role = await prisma.role.create({ data: { name: input.name, description: input.description, companyId, permissions: { connect: input.permissionIds.map((id) => ({ id })) } }, include: { permissions: true } });
  await recordAudit({ action: "ROLE_CREATE", entity: "Role", entityId: role.id, user: auth, request });
  return apiSuccess(role, "Role created", 201);
});
