import { withApiHandler } from "@/lib/api/handler";
import { paginationFrom, paginationMeta } from "@/lib/api/query";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { companyWhere } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions/constants";

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]); const { page, limit, skip } = paginationFrom(request);
  const where = { deletedAt: null, ...companyWhere(auth) };
  const [items, total] = await prisma.$transaction([prisma.errorLog.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }), prisma.errorLog.count({ where })]);
  return apiSuccess({ items, pagination: paginationMeta(total, page, limit) });
});
