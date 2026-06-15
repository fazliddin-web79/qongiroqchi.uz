import { ContactStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { paginationFrom, paginationMeta } from "@/lib/api/query";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { normalizePhone } from "@/lib/contacts/phone";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyIdForWrite, companyWhereForRequest } from "@/lib/modules/scope";
import { PERMISSION } from "@/lib/permissions/constants";

const schema = z.object({
  fullName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(40),
  extraFields: z.record(z.string(), z.unknown()).default({}),
  groupId: z.uuid().nullable().optional(),
  status: z.nativeEnum(ContactStatus).default(ContactStatus.ACTIVE),
  companyId: z.uuid().optional(),
});

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.CONTACT_READ);
  const { page, limit, skip } = paginationFrom(request);
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const groupId = request.nextUrl.searchParams.get("groupId");
  const statusValue = request.nextUrl.searchParams.get("status");
  const companyId = request.nextUrl.searchParams.get("companyId");
  const status = statusValue && Object.values(ContactStatus).includes(statusValue as ContactStatus) ? statusValue as ContactStatus : undefined;
  const where: Prisma.ContactWhereInput = {
    deletedAt: null,
    ...companyWhereForRequest(auth, companyId),
    ...(groupId ? { groupId } : {}),
    ...(status ? { status } : {}),
    ...(search ? { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.contact.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { group: { select: { id: true, name: true } }, company: { select: { id: true, name: true } } } }),
    prisma.contact.count({ where }),
  ]);
  return apiSuccess({ items, pagination: paginationMeta(total, page, limit) });
});

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.CONTACT_CREATE);
  const input = schema.parse(await request.json());
  const companyId = companyIdForWrite(auth, input.companyId);
  const phone = normalizePhone(input.phone);
  if (input.groupId && !(await prisma.contactGroup.findFirst({ where: { id: input.groupId, companyId, deletedAt: null } }))) throw new NotFoundError("Contact group");
  if (await prisma.contact.findFirst({ where: { companyId, phone, deletedAt: null } })) throw new ConflictError("A contact with this phone number already exists");
  const contact = await prisma.contact.create({ data: { companyId, fullName: input.fullName, phone, extraFields: input.extraFields as Prisma.InputJsonValue, groupId: input.groupId, status: input.status }, include: { group: { select: { id: true, name: true } } } });
  await recordAudit({ action: "CONTACT_CREATE", entity: "Contact", entityId: contact.id, user: auth, request });
  return apiSuccess(contact, "Contact created", 201);
});
