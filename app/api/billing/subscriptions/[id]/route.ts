import { SubscriptionStatus } from "@prisma/client";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.nativeEnum(SubscriptionStatus).optional(), endsAt: z.string().datetime().optional() });

export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.BILLING_UPDATE);
  const { id } = await params;
  const existing = await prisma.companySubscription.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Subscription");
  const input = schema.parse(await request.json());
  const endsAt = input.endsAt ? new Date(input.endsAt) : existing.endsAt;
  if (endsAt <= existing.startsAt) throw new ConflictError("endsAt must be after startsAt");
  const subscription = await prisma.$transaction(async (tx) => {
    if (input.status === SubscriptionStatus.ACTIVE || input.status === SubscriptionStatus.TRIAL) {
      await tx.companySubscription.updateMany({ where: { companyId: existing.companyId, id: { not: id }, deletedAt: null, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } }, data: { status: SubscriptionStatus.CANCELED } });
    }
    return tx.companySubscription.update({ where: { id }, data: { status: input.status, endsAt }, include: { plan: true, company: { select: { id: true, name: true } } } });
  });
  await recordAudit({ action: "SUBSCRIPTION_UPDATE", entity: "CompanySubscription", entityId: id, user: auth, request });
  return apiSuccess(subscription, "Subscription updated");
});
