import { z } from "zod";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ name: z.string().trim().min(2).max(120).optional(), description: z.string().trim().max(500).nullable().optional() });

export const GET = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CONTACT_READ);
  const { id } = await params;
  const group = await prisma.contactGroup.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) }, include: { _count: { select: { contacts: { where: { deletedAt: null } }, campaigns: { where: { deletedAt: null } } } } } });
  if (!group) throw new NotFoundError("Contact group");
  return apiSuccess(group);
});

export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CONTACT_UPDATE);
  const { id } = await params;
  const input = schema.parse(await request.json());
  const existing = await prisma.contactGroup.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } });
  if (!existing) throw new NotFoundError("Contact group");
  if (input.name) {
    const duplicate = await prisma.contactGroup.findFirst({ where: { companyId: existing.companyId, name: input.name, deletedAt: null, NOT: { id } } });
    if (duplicate) throw new ConflictError("A contact group with this name already exists");
  }
  const group = await prisma.contactGroup.update({ where: { id }, data: input });
  await recordAudit({ action: "CONTACT_GROUP_UPDATE", entity: "ContactGroup", entityId: id, user: auth, request });
  return apiSuccess(group, "Contact group updated");
});

export const DELETE = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CONTACT_DELETE);
  const { id } = await params;
  const existing = await prisma.contactGroup.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) }, include: { _count: { select: { campaigns: { where: { deletedAt: null } } } } } });
  if (!existing) throw new NotFoundError("Contact group");
  if (existing._count.campaigns) throw new ForbiddenError("Contact group is used by an active campaign");
  await prisma.$transaction([
    prisma.contact.updateMany({ where: { groupId: id, deletedAt: null }, data: { groupId: null } }),
    prisma.contactGroup.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);
  await recordAudit({ action: "CONTACT_GROUP_DELETE", entity: "ContactGroup", entityId: id, user: auth, request });
  return apiSuccess({}, "Contact group deleted");
});
