import { z } from "zod";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { ROLES } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ key: z.string().min(3).max(120).regex(/^[a-zA-Z]+\.[a-zA-Z]+$/).optional(), description: z.string().max(300).nullable().optional() });
export const GET = withApiHandler<Context>(async (request, { params }) => { await requireApiAuth(request, [ROLES.SUPER_ADMIN]); const { id } = await params; const item = await prisma.permission.findFirst({ where: { id, deletedAt: null } }); if (!item) throw new NotFoundError("Permission"); return apiSuccess(item); });
export const PATCH = withApiHandler<Context>(async (request, { params }) => { const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN]); const { id } = await params; if (!(await prisma.permission.findFirst({ where: { id, deletedAt: null } }))) throw new NotFoundError("Permission"); const item = await prisma.permission.update({ where: { id }, data: schema.parse(await request.json()) }); await recordAudit({ action: "PERMISSION_UPDATE", entity: "Permission", entityId: id, user: auth, request }); return apiSuccess(item, "Permission updated"); });
export const DELETE = withApiHandler<Context>(async (request, { params }) => { const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN]); const { id } = await params; if (!(await prisma.permission.findFirst({ where: { id, deletedAt: null } }))) throw new NotFoundError("Permission"); await prisma.permission.update({ where: { id }, data: { deletedAt: new Date(), roles: { set: [] } } }); await recordAudit({ action: "PERMISSION_DELETE", entity: "Permission", entityId: id, user: auth, request }); return apiSuccess({}, "Permission deleted"); });
