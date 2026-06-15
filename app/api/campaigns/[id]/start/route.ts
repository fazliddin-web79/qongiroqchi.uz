import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { launchCampaign } from "@/lib/calls/pipeline";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhere } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions/constants";
import { NotFoundError } from "@/lib/api/errors";

type Context = { params: Promise<{ id: string }> };

export const POST = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  const { id } = await params;
  if (!(await prisma.campaign.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } }))) throw new NotFoundError("Campaign");
  const result = await launchCampaign(id);
  await recordAudit({ action: "CAMPAIGN_START", entity: "Campaign", entityId: id, user: auth, request, metadata: result });
  return apiSuccess(result, "Campaign started");
});
