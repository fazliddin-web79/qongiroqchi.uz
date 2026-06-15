import { RoleName } from "@prisma/client";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { paginationFrom, paginationMeta } from "@/lib/api/query";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { isSuperAdmin } from "@/lib/permissions";
import { companyWhereForRequest } from "@/lib/modules/scope";
import { ROLES } from "@/lib/permissions/constants";
import { assertUserLimit } from "@/lib/billing/service";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  companyId: z.uuid().optional(),
  roleId: z.uuid(),
});

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  const { page, limit, skip } = paginationFrom(request);
  const where = { deletedAt: null, ...companyWhereForRequest(auth, request.nextUrl.searchParams.get("companyId")) };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, companyId: true, createdAt: true, roles: { where: { deletedAt: null }, select: { role: { select: { id: true, name: true } } } } } }),
    prisma.user.count({ where }),
  ]);
  return apiSuccess({ items, pagination: paginationMeta(total, page, limit) });
});

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  const input = createSchema.parse(await request.json());
  const companyId = isSuperAdmin(auth) ? input.companyId : auth.companyId ?? undefined;
  if (!companyId) throw new ForbiddenError("A company is required for this user");
  await assertUserLimit(companyId);
  const role = await prisma.role.findFirst({ where: { id: input.roleId, deletedAt: null, companyId } });
  if (!role || role.name === RoleName.SUPER_ADMIN) throw new NotFoundError("Company role");
  const user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password), companyId, roles: { create: { roleId: role.id } } }, select: { id: true, name: true, email: true, companyId: true, createdAt: true } });
  await recordAudit({ action: "USER_CREATE", entity: "User", entityId: user.id, user: auth, request });
  return apiSuccess(user, "User created", 201);
});
