import { SubscriptionStatus } from "@prisma/client";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { getBillingUsage } from "@/lib/billing/service";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhereForRequest } from "@/lib/modules/scope";
import { isSuperAdmin } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions/constants";
import { subscriptionSchema } from "@/lib/billing/validation";

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  const requestedCompanyId = request.nextUrl.searchParams.get("companyId");
  const where = { deletedAt: null, ...companyWhereForRequest(auth, requestedCompanyId) };
  const items = await prisma.companySubscription.findMany({ where, orderBy: { startsAt: "desc" }, include: { plan: true, company: { select: { id: true, name: true } } } });
  const usage = requestedCompanyId || auth.companyId ? await getBillingUsage(requestedCompanyId || auth.companyId!).then(({ usage }) => usage).catch(() => null) : null;
  return apiSuccess({ items, usage, canManage: isSuperAdmin(auth) });
});

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN]);
  const input = subscriptionSchema.parse(await request.json());
  const [company, plan] = await Promise.all([
    prisma.company.findFirst({ where: { id: input.companyId, deletedAt: null } }),
    prisma.plan.findFirst({ where: { id: input.planId, deletedAt: null } }),
  ]);
  if (!company) throw new NotFoundError("Company");
  if (!plan) throw new NotFoundError("Plan");
  const subscription = await prisma.$transaction(async (tx) => {
    await tx.companySubscription.updateMany({ where: { companyId: input.companyId, deletedAt: null, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } }, data: { status: SubscriptionStatus.CANCELED } });
    return tx.companySubscription.create({ data: { ...input, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt) }, include: { plan: true, company: { select: { id: true, name: true } } } });
  });
  await recordAudit({ action: "SUBSCRIPTION_CREATE", entity: "CompanySubscription", entityId: subscription.id, user: auth, request });
  return apiSuccess(subscription, "Subscription created", 201);
});
