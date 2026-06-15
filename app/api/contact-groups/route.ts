import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyIdForWrite, companyWhereForRequest } from "@/lib/modules/scope";
import { PERMISSION } from "@/lib/permissions/constants";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  companyId: z.uuid().optional(),
});

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.CONTACT_READ);
  const companyId = request.nextUrl.searchParams.get("companyId");
  const groups = await prisma.contactGroup.findMany({
    where: { deletedAt: null, ...companyWhereForRequest(auth, companyId) },
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: { where: { deletedAt: null } }, campaigns: { where: { deletedAt: null } } } } },
  });
  return apiSuccess(groups);
});

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.CONTACT_CREATE);
  const input = schema.parse(await request.json());
  const companyId = companyIdForWrite(auth, input.companyId);
  if (!(await prisma.company.findFirst({ where: { id: companyId, deletedAt: null } }))) throw new NotFoundError("Company");
  const existing = await prisma.contactGroup.findUnique({ where: { companyId_name: { companyId, name: input.name } } });
  if (existing && !existing.deletedAt) throw new ConflictError("A contact group with this name already exists");
  const group = existing
    ? await prisma.contactGroup.update({ where: { id: existing.id }, data: { description: input.description, deletedAt: null } })
    : await prisma.contactGroup.create({ data: { companyId, name: input.name, description: input.description } });
  await recordAudit({ action: "CONTACT_GROUP_CREATE", entity: "ContactGroup", entityId: group.id, user: auth, request });
  return apiSuccess(group, "Contact group created", 201);
});
