import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { submitCampaignForReview } from "@/lib/moderation/service";
import { companyWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";
import { NotFoundError } from "@/lib/api/errors";

type Context = { params: Promise<{ id: string }> };

export const POST = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CAMPAIGN_SUBMIT);
  const { id } = await params;
  if (!(await prisma.campaign.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } }))) throw new NotFoundError("Campaign");
  const campaign = await submitCampaignForReview(id);
  await recordAudit({ action: "CAMPAIGN_SUBMIT", entity: "Campaign", entityId: id, user: auth, request });
  return apiSuccess(campaign, "Campaign submitted for moderation");
});
