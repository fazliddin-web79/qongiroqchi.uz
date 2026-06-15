import { withApiHandler } from "@/lib/api/handler";
import { paginationFrom, paginationMeta } from "@/lib/api/query";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { companyWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.AUDIT_READ); const { page, limit, skip } = paginationFrom(request);
  const where = { deletedAt: null, ...companyWhere(auth) };
  const [items, total] = await prisma.$transaction([prisma.auditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, name: true, email: true } } } }), prisma.auditLog.count({ where })]);
  return apiSuccess({ items, pagination: paginationMeta(total, page, limit) });
});
