import { LeadStatus, Prisma, RoleName } from "@prisma/client";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { paginationFrom, paginationMeta } from "@/lib/api/query";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyIdForWrite, companyWhereForRequest } from "@/lib/modules/scope";
import { isOperator, leadWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";
import { notifyNewLead } from "@/lib/telegram/service";

const schema = z.object({
  companyId: z.uuid().optional(),
  campaignId: z.uuid().nullable().optional(),
  contactId: z.uuid().nullable().optional(),
  callId: z.uuid().nullable().optional(),
  source: z.string().trim().min(2).max(80).default("MANUAL"),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  assignedToId: z.uuid().nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
  callbackAt: z.string().datetime().nullable().optional(),
});

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.LEAD_READ);
  const { page, limit, skip } = paginationFrom(request);
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const campaignId = request.nextUrl.searchParams.get("campaignId");
  const assignedToId = request.nextUrl.searchParams.get("assignedToId");
  const companyId = request.nextUrl.searchParams.get("companyId");
  const statusValue = request.nextUrl.searchParams.get("status");
  const status = statusValue && Object.values(LeadStatus).includes(statusValue as LeadStatus) ? statusValue as LeadStatus : undefined;
  const scope = isOperator(auth) ? leadWhere(auth) : companyWhereForRequest(auth, companyId);
  const where: Prisma.LeadWhereInput = {
    deletedAt: null,
    ...scope,
    ...(campaignId ? { campaignId } : {}),
    ...(!isOperator(auth) && assignedToId ? { assignedToId } : {}),
    ...(status ? { status } : {}),
    ...(search ? { OR: [{ contact: { fullName: { contains: search, mode: "insensitive" } } }, { contact: { phone: { contains: search } } }, { note: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.lead.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { contact: { select: { id: true, fullName: true, phone: true } }, campaign: { select: { id: true, name: true } }, call: { select: { id: true, status: true, pressedKey: true, recordingUrl: true } }, assignedTo: { select: { id: true, name: true, email: true } }, company: { select: { id: true, name: true } }, _count: { select: { history: true } } } }),
    prisma.lead.count({ where }),
  ]);
  return apiSuccess({ items, pagination: paginationMeta(total, page, limit) });
});

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.LEAD_ASSIGN);
  const input = schema.parse(await request.json());
  let companyId = companyIdForWrite(auth, input.companyId);
  let campaignId = input.campaignId ?? null;
  let contactId = input.contactId ?? null;
  if (input.callId) {
    const call = await prisma.call.findFirst({ where: { id: input.callId, companyId } });
    if (!call) throw new NotFoundError("Call");
    if (await prisma.lead.findFirst({ where: { callId: input.callId, deletedAt: null } })) throw new ConflictError("A lead already exists for this call");
    companyId = call.companyId; campaignId = call.campaignId; contactId = call.contactId;
  }
  if (campaignId && !(await prisma.campaign.findFirst({ where: { id: campaignId, companyId, deletedAt: null } }))) throw new NotFoundError("Campaign");
  if (contactId && !(await prisma.contact.findFirst({ where: { id: contactId, companyId, deletedAt: null } }))) throw new NotFoundError("Contact");
  if (input.assignedToId && !(await prisma.user.findFirst({ where: { id: input.assignedToId, companyId, deletedAt: null, roles: { some: { deletedAt: null, role: { name: RoleName.OPERATOR, deletedAt: null } } } } }))) throw new NotFoundError("Assigned operator");
  const lead = await prisma.lead.create({
    data: { companyId, campaignId, contactId, callId: input.callId, source: input.source, status: input.status, assignedToId: input.assignedToId, note: input.note, callbackAt: input.callbackAt ? new Date(input.callbackAt) : null, history: { create: { action: "LEAD_CREATE", toStatus: input.status, note: input.note, userId: auth.id } } },
    include: { contact: { select: { id: true, fullName: true, phone: true } }, campaign: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } },
  });
  await notifyNewLead(lead.id);
  await recordAudit({ action: "LEAD_CREATE", entity: "Lead", entityId: lead.id, user: auth, request });
  return apiSuccess(lead, "Lead created", 201);
});
