import { z } from "zod";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhere } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ resolved: z.boolean() });
export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]); const { id } = await params; const input = schema.parse(await request.json());
  if (!(await prisma.errorLog.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } }))) throw new NotFoundError("Error log");
  const item = await prisma.errorLog.update({ where: { id }, data: { resolvedAt: input.resolved ? new Date() : null } });
  await recordAudit({ action: "ERROR_LOG_RESOLVE", entity: "ErrorLog", entityId: id, user: auth, request }); return apiSuccess(item, "Error log updated");
});
