import { CampaignStatus } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };

export const POST = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CAMPAIGN_PAUSE);
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } });
  if (!campaign) throw new NotFoundError("Campaign");
  if (campaign.status !== CampaignStatus.RUNNING) throw new ConflictError("Only running campaigns can be paused");
  const updated = await prisma.campaign.update({ where: { id }, data: { status: CampaignStatus.PAUSED } });
  await recordAudit({ action: "CAMPAIGN_PAUSE", entity: "Campaign", entityId: id, user: auth, request });
  return apiSuccess(updated, "Campaign paused");
});
