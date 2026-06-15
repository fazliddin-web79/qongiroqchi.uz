import { z } from "zod";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { paginationFrom, paginationMeta } from "@/lib/api/query";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { isSuperAdmin, leadWhere } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions/constants";

const schema = z.object({ name: z.string().min(2).max(160), phone: z.string().min(7).max(30), email: z.email().optional(), status: z.string().min(2).max(40).default("NEW"), companyId: z.uuid().optional(), assignedToId: z.uuid().optional() });

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR]); const { page, limit, skip } = paginationFrom(request);
  const where = { deletedAt: null, ...leadWhere(auth) };
  const [items, total] = await prisma.$transaction([prisma.lead.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { assignedTo: { select: { id: true, name: true, email: true } }, company: { select: { id: true, name: true } } } }), prisma.lead.count({ where })]);
  return apiSuccess({ items, pagination: paginationMeta(total, page, limit) });
});

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]); const input = schema.parse(await request.json());
  const companyId = isSuperAdmin(auth) ? input.companyId : auth.companyId ?? undefined;
  if (!companyId) throw new ForbiddenError("A company is required");
  if (input.assignedToId && !(await prisma.user.findFirst({ where: { id: input.assignedToId, companyId, deletedAt: null } }))) throw new NotFoundError("Assigned operator");
  const lead = await prisma.lead.create({ data: { name: input.name, phone: input.phone, email: input.email, status: input.status, companyId, assignedToId: input.assignedToId } });
  await recordAudit({ action: "LEAD_CREATE", entity: "Lead", entityId: lead.id, user: auth, request }); return apiSuccess(lead, "Lead created", 201);
});
