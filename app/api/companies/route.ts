import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { paginationFrom, paginationMeta } from "@/lib/api/query";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { ROLES } from "@/lib/permissions/constants";
import { ensureDefaultCompanySetup } from "@/lib/billing/service";

const schema = z.object({ name: z.string().min(2).max(160), slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/) });

export const GET = withApiHandler(async (request) => {
  await requireApiAuth(request, [ROLES.SUPER_ADMIN]);
  const { page, limit, skip } = paginationFrom(request);
  const where = { deletedAt: null };
  const [items, total] = await prisma.$transaction([prisma.company.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { _count: { select: { users: true, leads: true } } } }), prisma.company.count({ where })]);
  return apiSuccess({ items, pagination: paginationMeta(total, page, limit) });
});

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN]);
  const input = schema.parse(await request.json());
  const company = await prisma.$transaction(async (tx) => {
    const created = await tx.company.create({ data: input });
    await ensureDefaultCompanySetup(tx, created.id);
    return created;
  });
  await recordAudit({ action: "COMPANY_CREATE", entity: "Company", entityId: company.id, user: auth, request });
  return apiSuccess(company, "Company created", 201);
});
