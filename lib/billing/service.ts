import { Prisma, SubscriptionStatus } from "@prisma/client";
import { ConflictError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";

const ACTIVE_STATUSES = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL];

export async function ensureDefaultCompanySetup(tx: Prisma.TransactionClient, companyId: string) {
  const plan = await tx.plan.upsert({
    where: { name: "Free" },
    update: { deletedAt: null },
    create: { name: "Free", monthlyPrice: 0, callLimit: 1_000, userLimit: 5, campaignLimit: 5, features: { telegram: true, queue: true } },
  });
  await tx.companySetting.upsert({ where: { companyId }, update: { deletedAt: null }, create: { companyId } });
  const subscription = await tx.companySubscription.findFirst({ where: { companyId, deletedAt: null } });
  if (!subscription) {
    await tx.companySubscription.create({
      data: { companyId, planId: plan.id, status: SubscriptionStatus.ACTIVE, startsAt: new Date(), endsAt: new Date("2126-01-01T00:00:00.000Z") },
    });
  }
}

export async function getBillingUsage(companyId: string) {
  const now = new Date();
  const subscription = await prisma.companySubscription.findFirst({
    where: { companyId, deletedAt: null, status: { in: ACTIVE_STATUSES }, startsAt: { lte: now }, endsAt: { gte: now }, plan: { deletedAt: null } },
    orderBy: { startsAt: "desc" },
    include: { plan: true },
  });
  if (!subscription) throw new ConflictError("Company has no active subscription");
  const period = { gte: subscription.startsAt, lte: subscription.endsAt };
  const [calls, users, campaigns] = await Promise.all([
    prisma.call.count({ where: { companyId, createdAt: period } }),
    prisma.user.count({ where: { companyId, deletedAt: null } }),
    prisma.campaign.count({ where: { companyId, deletedAt: null, createdAt: period } }),
  ]);
  return { subscription, usage: { calls, users, campaigns } };
}

export async function assertCallLimit(companyId: string, requestedCalls: number) {
  const { subscription, usage } = await getBillingUsage(companyId);
  if (usage.calls + requestedCalls > subscription.plan.callLimit) throw new ConflictError(`Call limit exceeded (${usage.calls}/${subscription.plan.callLimit})`);
}

export async function assertUserLimit(companyId: string) {
  const { subscription, usage } = await getBillingUsage(companyId);
  if (usage.users >= subscription.plan.userLimit) throw new ConflictError(`User limit exceeded (${usage.users}/${subscription.plan.userLimit})`);
}

export async function assertCampaignLimit(companyId: string) {
  const { subscription, usage } = await getBillingUsage(companyId);
  if (usage.campaigns >= subscription.plan.campaignLimit) throw new ConflictError(`Campaign limit exceeded (${usage.campaigns}/${subscription.plan.campaignLimit})`);
}
