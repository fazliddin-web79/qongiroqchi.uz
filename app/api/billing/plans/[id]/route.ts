import { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { planSchema } from "@/lib/billing/validation";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { ROLES } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const updateSchema = planSchema.partial();

export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN]);
  const { id } = await params;
  if (!(await prisma.plan.findFirst({ where: { id, deletedAt: null } }))) throw new NotFoundError("Plan");
  const input = updateSchema.parse(await request.json());
  const plan = await prisma.plan.update({ where: { id }, data: { ...input, features: input.features as Prisma.InputJsonValue | undefined } });
  await recordAudit({ action: "PLAN_UPDATE", entity: "Plan", entityId: id, user: auth, request });
  return apiSuccess(plan, "Plan updated");
});

export const DELETE = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN]);
  const { id } = await params;
  if (!(await prisma.plan.findFirst({ where: { id, deletedAt: null } }))) throw new NotFoundError("Plan");
  if (await prisma.companySubscription.count({ where: { planId: id, deletedAt: null, status: { in: ["ACTIVE", "TRIAL"] } } })) throw new ConflictError("Plan has active subscriptions");
  await prisma.plan.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordAudit({ action: "PLAN_DELETE", entity: "Plan", entityId: id, user: auth, request });
  return apiSuccess({}, "Plan deleted");
});
