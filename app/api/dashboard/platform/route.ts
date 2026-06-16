import { CampaignStatus, CompanyStatus, SubscriptionStatus } from "@prisma/client";
import { ForbiddenError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { isPlatformUser } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";
import { getQueueSnapshot } from "@/lib/queue/call-queue";

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.REPORT_READ);
  if (!isPlatformUser(auth) || auth.isImpersonating) throw new ForbiddenError("Platform dashboard is only available to platform users");
  const now = new Date();
  const [totalCompanies, activeCompanies, suspendedCompanies, totalCampaigns, runningCampaigns, pendingCampaigns, pendingAudio, totalCalls, totalLeads, activeSubscriptions, systemErrors, subscriptions] = await Promise.all([
    prisma.company.count({ where: { deletedAt: null } }),
    prisma.company.count({ where: { deletedAt: null, status: CompanyStatus.ACTIVE } }),
    prisma.company.count({ where: { deletedAt: null, status: CompanyStatus.SUSPENDED } }),
    prisma.campaign.count({ where: { deletedAt: null } }),
    prisma.campaign.count({ where: { deletedAt: null, status: CampaignStatus.RUNNING } }),
    prisma.campaign.count({ where: { deletedAt: null, status: CampaignStatus.PENDING_REVIEW } }),
    prisma.audioAsset.count({ where: { deletedAt: null, status: "PENDING_REVIEW" } }),
    prisma.call.count(),
    prisma.lead.count({ where: { deletedAt: null } }),
    prisma.companySubscription.count({ where: { deletedAt: null, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] }, startsAt: { lte: now }, endsAt: { gt: now } } }),
    prisma.errorLog.count({ where: { deletedAt: null, resolvedAt: null } }),
    prisma.companySubscription.findMany({ where: { deletedAt: null, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] }, startsAt: { lte: now }, endsAt: { gt: now } }, select: { plan: { select: { monthlyPrice: true } } } }),
  ]);
  const queue = await getQueueSnapshot().then((value) => ({ status: value.status, workers: value.workers, counts: value.counts })).catch(() => ({ status: "DISCONNECTED", workers: 0, counts: null }));
  return apiSuccess({
    totals: {
      totalCompanies, activeCompanies, suspendedCompanies, totalCampaigns, runningCampaigns,
      totalCalls, totalLeads, monthlyRevenue: subscriptions.reduce((sum, item) => sum + Number(item.plan.monthlyPrice), 0),
      activeSubscriptions, pendingApprovals: pendingCampaigns + pendingAudio, systemErrors,
    },
    approvals: { campaigns: pendingCampaigns, audio: pendingAudio },
    queue,
  });
});
