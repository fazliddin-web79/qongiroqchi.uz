import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { ROLES } from "@/lib/permissions/constants";

const schema = z.object({ key: z.string().min(3).max(120).regex(/^[a-zA-Z]+\.[a-zA-Z]+$/), description: z.string().max(300).optional() });
export const GET = withApiHandler(async (request) => { await requireApiAuth(request, [ROLES.SUPER_ADMIN]); return apiSuccess(await prisma.permission.findMany({ where: { deletedAt: null }, orderBy: { key: "asc" } })); });
export const POST = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN]); const input = schema.parse(await request.json());
  const permission = await prisma.permission.create({ data: input }); await recordAudit({ action: "PERMISSION_CREATE", entity: "Permission", entityId: permission.id, user: auth, request });
  return apiSuccess(permission, "Permission created", 201);
});
