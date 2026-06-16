import { LeadStatus, Prisma, RoleName } from "@prisma/client";
import { z } from "zod";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth, requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { assertPermission, isOperator, leadWhere } from "@/lib/permissions";
import { PERMISSION, ROLES } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.string().trim().min(2).max(80).optional(),
  assignedToId: z.uuid().nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
  callbackAt: z.string().datetime().nullable().optional(),
});

export const GET = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.LEAD_READ);
  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null, ...leadWhere(auth) }, include: { contact: true, campaign: { select: { id: true, name: true } }, call: true, assignedTo: { select: { id: true, name: true, email: true } }, company: { select: { id: true, name: true } }, history: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, name: true } } } } } });
  if (!lead) throw new NotFoundError("Lead");
  return apiSuccess(lead);
});

export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request);
  const { id } = await params;
  const input = schema.parse(await request.json());
  const changes = Object.keys(input);
  if (input.assignedToId !== undefined || input.source !== undefined) assertPermission(auth, PERMISSION.LEAD_ASSIGN);
  if (input.status !== undefined || input.callbackAt !== undefined || changes.length === 0) assertPermission(auth, PERMISSION.LEAD_UPDATE_STATUS);
  if (input.note !== undefined) assertPermission(auth, PERMISSION.LEAD_ADD_NOTE);
  const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null, ...leadWhere(auth) } });
  if (!existing) throw new NotFoundError("Lead");
  if (isOperator(auth) && Object.keys(input).some((key) => !["status", "note", "callbackAt"].includes(key))) throw new ForbiddenError("Operators can only update lead status, note, and callback time");
  if (input.assignedToId && !(await prisma.user.findFirst({ where: { id: input.assignedToId, companyId: existing.companyId, deletedAt: null, roles: { some: { deletedAt: null, role: { name: RoleName.OPERATOR, deletedAt: null } } } } }))) throw new NotFoundError("Assigned operator");
  const action = input.assignedToId !== undefined && input.assignedToId !== existing.assignedToId ? "LEAD_ASSIGN" : input.status && input.status !== existing.status ? "STATUS_CHANGE" : input.callbackAt !== undefined ? "CALLBACK_SET" : input.note !== undefined ? "NOTE_ADD" : "LEAD_UPDATE";
  const metadata = {
    ...(input.callbackAt !== undefined ? { callbackAt: input.callbackAt } : {}),
    ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
  } as Prisma.InputJsonObject;
  const lead = await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({ where: { id }, data: { status: input.status, source: input.source, assignedToId: input.assignedToId, note: input.note, callbackAt: input.callbackAt === undefined ? undefined : input.callbackAt ? new Date(input.callbackAt) : null }, include: { contact: { select: { id: true, fullName: true, phone: true } }, campaign: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } } });
    await tx.leadHistory.create({ data: { leadId: id, userId: auth.id, action, fromStatus: existing.status, toStatus: input.status ?? existing.status, note: input.note, metadata } });
    return updated;
  });
  await recordAudit({ action: "LEAD_UPDATE", entity: "Lead", entityId: id, user: auth, request, metadata: { action } });
  return apiSuccess(lead, "Lead updated");
});

export const DELETE = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.COMPANY_OWNER, ROLES.COMPANY_ADMIN]);
  const { id } = await params;
  const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null, ...leadWhere(auth) } });
  if (!existing) throw new NotFoundError("Lead");
  await prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
  await prisma.leadHistory.create({ data: { leadId: id, userId: auth.id, action: "LEAD_DELETE", fromStatus: existing.status, toStatus: LeadStatus.ARCHIVED } });
  await recordAudit({ action: "LEAD_DELETE", entity: "Lead", entityId: id, user: auth, request });
  return apiSuccess({}, "Lead deleted");
});
