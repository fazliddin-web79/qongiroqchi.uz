import { z } from "zod";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { isOperator, leadWhere } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ name: z.string().min(2).max(160).optional(), phone: z.string().min(7).max(30).optional(), email: z.email().nullable().optional(), status: z.string().min(2).max(40).optional(), assignedToId: z.uuid().nullable().optional() });

export const GET = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR]); const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null, ...leadWhere(auth) }, include: { assignedTo: { select: { id: true, name: true, email: true } }, company: { select: { id: true, name: true } } } });
  if (!lead) throw new NotFoundError("Lead"); return apiSuccess(lead);
});
export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR]); const { id } = await params; const input = schema.parse(await request.json());
  const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null, ...leadWhere(auth) } }); if (!existing) throw new NotFoundError("Lead");
  if (isOperator(auth) && Object.keys(input).some((key) => key !== "status")) throw new ForbiddenError("Operators can only update lead status");
  if (input.assignedToId && !(await prisma.user.findFirst({ where: { id: input.assignedToId, companyId: existing.companyId, deletedAt: null } }))) throw new NotFoundError("Assigned operator");
  const lead = await prisma.lead.update({ where: { id }, data: input });
  await recordAudit({ action: "LEAD_UPDATE", entity: "Lead", entityId: id, user: auth, request }); return apiSuccess(lead, "Lead updated");
});
export const DELETE = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]); const { id } = await params;
  const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null, ...leadWhere(auth) } }); if (!existing) throw new NotFoundError("Lead");
  await prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordAudit({ action: "LEAD_DELETE", entity: "Lead", entityId: id, user: auth, request }); return apiSuccess({}, "Lead deleted");
});
