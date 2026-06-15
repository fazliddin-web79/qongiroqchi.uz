import { CampaignStatus } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";
import { resumeCampaignJobs } from "@/lib/queue/call-queue";

type Context = { params: Promise<{ id: string }> };

export const POST = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CAMPAIGN_PAUSE);
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } });
  if (!campaign) throw new NotFoundError("Campaign");
  if (campaign.status !== CampaignStatus.PAUSED) throw new ConflictError("Only paused campaigns can be resumed");
  await prisma.campaign.update({ where: { id }, data: { status: CampaignStatus.RUNNING } });
  try {
    const jobs = await resumeCampaignJobs(id);
    await recordAudit({ action: "CAMPAIGN_RESUME", entity: "Campaign", entityId: id, user: auth, request, metadata: jobs });
    return apiSuccess(jobs, "Campaign resumed");
  } catch (error) {
    await prisma.campaign.update({ where: { id }, data: { status: CampaignStatus.PAUSED } });
    throw error;
  }
});
