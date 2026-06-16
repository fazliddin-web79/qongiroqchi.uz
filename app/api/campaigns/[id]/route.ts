import { CampaignStatus, Prisma } from "@prisma/client";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { parseStartTime, updateCampaignSchema } from "@/lib/campaigns/validation";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };

export const GET = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CAMPAIGN_READ);
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) }, include: { audioAsset: true, moderationReviews: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, include: { reviewer: { select: { id: true, name: true } } } }, contactGroup: { select: { id: true, name: true, _count: { select: { contacts: { where: { deletedAt: null } } } } } }, createdBy: { select: { id: true, name: true } }, company: { select: { id: true, name: true, status: true } } } });
  if (!campaign) throw new NotFoundError("Campaign");
  return apiSuccess(campaign);
});

export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CAMPAIGN_UPDATE);
  const { id } = await params;
  const input = updateCampaignSchema.parse(await request.json());
  const existing = await prisma.campaign.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } });
  if (!existing) throw new NotFoundError("Campaign");
  if (input.contactGroupId && !(await prisma.contactGroup.findFirst({ where: { id: input.contactGroupId, companyId: existing.companyId, deletedAt: null } }))) throw new NotFoundError("Contact group");
  const audioAsset = input.audioAssetId
    ? await prisma.audioAsset.findFirst({ where: { id: input.audioAssetId, companyId: existing.companyId, deletedAt: null } })
    : null;
  if (input.audioAssetId && !audioAsset) throw new NotFoundError("Audio asset");
  const startTime = input.startTime === undefined ? existing.startTime : parseStartTime(input.startTime);
  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      audioUrl: audioAsset?.url,
      audioAssetId: input.audioAssetId,
      contactGroupId: input.contactGroupId,
      status: input.audioAssetId && input.audioAssetId !== existing.audioAssetId ? CampaignStatus.AUDIO_UPLOADED : undefined,
      rejectionReason: input.audioAssetId && input.audioAssetId !== existing.audioAssetId ? null : undefined,
      startTime,
      retryEnabled: input.retryEnabled,
      retryCount: input.retryEnabled === false ? 0 : input.retryCount,
      ivrSettings: input.ivrSettings as Prisma.InputJsonValue | undefined,
    },
    include: { audioAsset: true, contactGroup: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
  });
  await recordAudit({ action: "CAMPAIGN_UPDATE", entity: "Campaign", entityId: id, user: auth, request });
  return apiSuccess(campaign, "Campaign updated");
});

export const DELETE = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CAMPAIGN_DELETE);
  const { id } = await params;
  if (!(await prisma.campaign.findFirst({ where: { id, deletedAt: null, ...companyWhere(auth) } }))) throw new NotFoundError("Campaign");
  await prisma.campaign.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordAudit({ action: "CAMPAIGN_DELETE", entity: "Campaign", entityId: id, user: auth, request });
  return apiSuccess({}, "Campaign deleted");
});
