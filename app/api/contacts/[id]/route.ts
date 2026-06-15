import { ContactStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { normalizePhone } from "@/lib/contacts/phone";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({
  fullName: z.string().trim().min(2).max(160).optional(),
  phone: z.string().trim().min(7).max(40).optional(),
  extraFields: z.record(z.string(), z.unknown()).optional(),
  groupId: z.uuid().nullable().optional(),
  status: z.nativeEnum(ContactStatus).optional(),
});

export const GET = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CONTACT_READ);
  const { id } = await params;
  const contact = await prisma.contact.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) }, include: { group: { select: { id: true, name: true } }, company: { select: { id: true, name: true } } } });
  if (!contact) throw new NotFoundError("Contact");
  return apiSuccess(contact);
});

export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CONTACT_UPDATE);
  const { id } = await params;
  const input = schema.parse(await request.json());
  const existing = await prisma.contact.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } });
  if (!existing) throw new NotFoundError("Contact");
  const phone = input.phone ? normalizePhone(input.phone) : undefined;
  if (phone && await prisma.contact.findFirst({ where: { companyId: existing.companyId, phone, deletedAt: null, NOT: { id } } })) throw new ConflictError("A contact with this phone number already exists");
  if (input.groupId && !(await prisma.contactGroup.findFirst({ where: { id: input.groupId, companyId: existing.companyId, deletedAt: null } }))) throw new NotFoundError("Contact group");
  const contact = await prisma.contact.update({ where: { id }, data: { fullName: input.fullName, phone, extraFields: input.extraFields as Prisma.InputJsonValue | undefined, groupId: input.groupId, status: input.status }, include: { group: { select: { id: true, name: true } } } });
  await recordAudit({ action: "CONTACT_UPDATE", entity: "Contact", entityId: id, user: auth, request });
  return apiSuccess(contact, "Contact updated");
});

export const DELETE = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CONTACT_DELETE);
  const { id } = await params;
  if (!(await prisma.contact.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } }))) throw new NotFoundError("Contact");
  await prisma.contact.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordAudit({ action: "CONTACT_DELETE", entity: "Contact", entityId: id, user: auth, request });
  return apiSuccess({}, "Contact deleted");
});
