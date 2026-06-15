import { Prisma } from "@prisma/client";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { isSuperAdmin } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions/constants";
import { planSchema } from "@/lib/billing/validation";

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  const items = await prisma.plan.findMany({ where: { deletedAt: null }, orderBy: { monthlyPrice: "asc" }, include: { _count: { select: { subscriptions: true } } } });
  return apiSuccess({ items, canManage: isSuperAdmin(auth) });
});

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN]);
  const input = planSchema.parse(await request.json());
  const plan = await prisma.plan.create({ data: { ...input, features: input.features as Prisma.InputJsonValue } });
  await recordAudit({ action: "PLAN_CREATE", entity: "Plan", entityId: plan.id, user: auth, request });
  return apiSuccess(plan, "Plan created", 201);
});
