import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { launchCampaign } from "@/lib/calls/pipeline";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";
import { NotFoundError } from "@/lib/api/errors";
import { CampaignStatus } from "@prisma/client";

type Context = { params: Promise<{ id: string }> };

export const POST = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CAMPAIGN_START);
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } });
  if (!campaign) throw new NotFoundError("Campaign");
  if (campaign.status === CampaignStatus.APPROVED && campaign.startTime && campaign.startTime > new Date()) {
    const scheduled = await prisma.campaign.update({ where: { id }, data: { status: CampaignStatus.SCHEDULED } });
    await recordAudit({ action: "CAMPAIGN_SCHEDULE", entity: "Campaign", entityId: id, user: auth, request });
    return apiSuccess(scheduled, "Campaign scheduled");
  }
  const result = await launchCampaign(id);
  await recordAudit({ action: "CAMPAIGN_START", entity: "Campaign", entityId: id, user: auth, request, metadata: result });
  return apiSuccess(result, "Campaign started");
});
