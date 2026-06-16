import { z } from "zod";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth, requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { isPlatformUser } from "@/lib/permissions";
import { PERMISSION, ROLES } from "@/lib/permissions/constants";
import type { AuthUser } from "@/types/auth";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ name: z.string().min(2).max(160).optional(), slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/).optional() });
function assertCompany(auth: AuthUser, id: string) { if (!isPlatformUser(auth) && auth.companyId !== id) throw new ForbiddenError(); }

export const GET = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.COMPANY_READ);
  const { id } = await params; assertCompany(auth, id);
  const company = await prisma.company.findFirst({ where: { id, deletedAt: null }, include: { _count: { select: { users: true, leads: true } } } });
  if (!company) throw new NotFoundError("Company");
  return apiSuccess(company);
});
export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.COMPANY_MANAGE);
  const { id } = await params; assertCompany(auth, id);
  if (!(await prisma.company.findFirst({ where: { id, deletedAt: null } }))) throw new NotFoundError("Company");
  const company = await prisma.company.update({ where: { id }, data: schema.parse(await request.json()) });
  await recordAudit({ action: "COMPANY_UPDATE", entity: "Company", entityId: id, user: auth, request });
  return apiSuccess(company, "Company updated");
});
export const DELETE = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN]);
  const { id } = await params;
  if (!(await prisma.company.findFirst({ where: { id, deletedAt: null } }))) throw new NotFoundError("Company");
  await prisma.company.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordAudit({ action: "COMPANY_DELETE", entity: "Company", entityId: id, user: auth, request });
  return apiSuccess({}, "Company deleted");
});
