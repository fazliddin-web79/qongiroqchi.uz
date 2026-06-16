import { CallStatus, CampaignStatus, LeadStatus, Prisma, RoleName } from "@prisma/client";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { companyWhereForRequest } from "@/lib/modules/scope";
import { companyWhere, isOperator, leadWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.REPORT_READ);
  const requestedCompanyId = request.nextUrl.searchParams.get("companyId");
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const leadScope: Prisma.LeadWhereInput = isOperator(auth) ? leadWhere(auth) : companyWhereForRequest(auth, requestedCompanyId);
  const callScope: Prisma.CallWhereInput = isOperator(auth)
    ? { ...companyWhere(auth), lead: { assignedToId: auth.id, deletedAt: null } }
    : companyWhereForRequest(auth, requestedCompanyId);
  const campaignScope: Prisma.CampaignWhereInput = isOperator(auth)
    ? { ...companyWhere(auth), deletedAt: null, leads: { some: { assignedToId: auth.id, deletedAt: null } } }
    : { ...companyWhereForRequest(auth, requestedCompanyId), deletedAt: null };

  const [callStatuses, leadStatuses, campaigns, callsByCampaign, leadsByCampaign, operators, callsToday, leadsToday, activeCampaigns] = await Promise.all([
    prisma.call.groupBy({ by: ["status"], where: callScope, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["status"], where: { ...leadScope, deletedAt: null }, _count: { _all: true } }),
    prisma.campaign.findMany({ where: campaignScope, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, name: true, status: true } }),
    prisma.call.groupBy({ by: ["campaignId", "status"], where: callScope, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["campaignId"], where: { ...leadScope, deletedAt: null, campaignId: { not: null } }, _count: { _all: true } }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(isOperator(auth) ? { id: auth.id } : companyWhereForRequest(auth, requestedCompanyId)),
        roles: { some: { deletedAt: null, role: { name: RoleName.OPERATOR, deletedAt: null } } },
      },
      select: { id: true, name: true, assignedLeads: { where: { deletedAt: null, status: { not: LeadStatus.ARCHIVED } }, select: { status: true } } },
    }),
    prisma.call.count({ where: { ...callScope, createdAt: { gte: startOfDay } } }),
    prisma.lead.count({ where: { ...leadScope, deletedAt: null, createdAt: { gte: startOfDay } } }),
    prisma.campaign.count({ where: { ...campaignScope, status: { in: [CampaignStatus.SCHEDULED, CampaignStatus.RUNNING, CampaignStatus.PAUSED] } } }),
  ]);

  const callCount = (status?: CallStatus) => callStatuses.filter((item) => !status || item.status === status).reduce((sum, item) => sum + item._count._all, 0);
  const leadCount = (status?: LeadStatus) => leadStatuses.filter((item) => !status || item.status === status).reduce((sum, item) => sum + item._count._all, 0);
  const answeredCalls = callCount(CallStatus.ANSWERED) + callCount(CallStatus.COMPLETED);
  const totalLeads = leadCount();
  const callCampaignMap = new Map<string, { total: number; answered: number; failed: number }>();
  callsByCampaign.forEach((item) => {
    const current = callCampaignMap.get(item.campaignId) ?? { total: 0, answered: 0, failed: 0 };
    current.total += item._count._all;
    if (([CallStatus.ANSWERED, CallStatus.COMPLETED] as CallStatus[]).includes(item.status)) current.answered += item._count._all;
    if (item.status === CallStatus.FAILED) current.failed += item._count._all;
    callCampaignMap.set(item.campaignId, current);
  });
  const leadCampaignMap = new Map(leadsByCampaign.map((item) => [item.campaignId!, item._count._all]));

  return apiSuccess({
    totals: {
      totalCalls: callCount(),
      answeredCalls,
      failedCalls: callCount(CallStatus.FAILED),
      leads: totalLeads,
      conversionRate: answeredCalls ? Number(((totalLeads / answeredCalls) * 100).toFixed(1)) : 0,
      totalCampaigns: campaigns.length,
      activeCampaigns,
      callsToday,
      leadsToday,
    },
    campaignStatistics: campaigns.map((campaign) => ({ ...campaign, ...(callCampaignMap.get(campaign.id) ?? { total: 0, answered: 0, failed: 0 }), leads: leadCampaignMap.get(campaign.id) ?? 0 })),
    operatorStatistics: operators.map((operator) => ({
      id: operator.id,
      name: operator.name,
      total: operator.assignedLeads.length,
      new: operator.assignedLeads.filter(({ status }) => status === LeadStatus.NEW).length,
      interested: operator.assignedLeads.filter(({ status }) => status === LeadStatus.INTERESTED).length,
      sold: operator.assignedLeads.filter(({ status }) => status === LeadStatus.SOLD).length,
    })),
  });
});
