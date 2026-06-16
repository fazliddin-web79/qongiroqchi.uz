import { RoleName } from "@prisma/client";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { paginationFrom, paginationMeta } from "@/lib/api/query";
import { apiSuccess } from "@/lib/api/response";
import { requireAnyApiPermission, requireApiPermission } from "@/lib/auth/api";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { isPlatformUser } from "@/lib/permissions";
import { companyWhereForRequest } from "@/lib/modules/scope";
import { assertPermission } from "@/lib/permissions";
import { PERMISSION, PLATFORM_ROLES } from "@/lib/permissions/constants";
import { assertUserLimit } from "@/lib/billing/service";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  companyId: z.uuid().optional(),
  roleId: z.uuid(),
});

export const GET = withApiHandler(async (request) => {
  const auth = await requireAnyApiPermission(request, [PERMISSION.USER_CREATE, PERMISSION.USER_INVITE, PERMISSION.USER_UPDATE, PERMISSION.USER_DELETE]);
  const { page, limit, skip } = paginationFrom(request);
  const where = { deletedAt: null, ...companyWhereForRequest(auth, request.nextUrl.searchParams.get("companyId")) };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, companyId: true, createdAt: true, roles: { where: { deletedAt: null }, select: { role: { select: { id: true, name: true } } } } } }),
    prisma.user.count({ where }),
  ]);
  return apiSuccess({ items, pagination: paginationMeta(total, page, limit) });
});

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.USER_CREATE);
  const input = createSchema.parse(await request.json());
  const role = await prisma.role.findFirst({ where: { id: input.roleId, deletedAt: null } });
  if (!role) throw new NotFoundError("Role");
  const platformRole = PLATFORM_ROLES.includes(role.name as typeof PLATFORM_ROLES[number]);
  let companyId: string | null = null;
  if (platformRole) {
    if (!isPlatformUser(auth)) throw new ForbiddenError("Only platform users can create platform users");
    assertPermission(auth, PERMISSION.PLATFORM_USER_MANAGE);
    if (role.name === RoleName.SUPER_ADMIN && !auth.roles.includes(RoleName.SUPER_ADMIN)) throw new ForbiddenError("Only SUPER_ADMIN can create another SUPER_ADMIN");
  } else {
    companyId = isPlatformUser(auth) ? input.companyId ?? role.companyId : auth.companyId ?? null;
    if (!companyId || role.companyId !== companyId) throw new ForbiddenError("A matching company role is required");
    await assertUserLimit(companyId);
  }
  const user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password), companyId, roles: { create: { roleId: role.id } } }, select: { id: true, name: true, email: true, companyId: true, createdAt: true } });
  await recordAudit({ action: "USER_CREATE", entity: "User", entityId: user.id, user: auth, request });
  return apiSuccess(user, "User created", 201);
});
