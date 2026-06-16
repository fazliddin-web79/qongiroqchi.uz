import { AudioReviewStatus, CampaignStatus, ModerationDecision, ModerationSubjectType } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";
import { notifyCompany, notifyPlatform } from "@/lib/notifications/service";

export async function submitCampaignForReview(campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, deletedAt: null },
    include: { audioAsset: true, contactGroup: { select: { _count: { select: { contacts: { where: { deletedAt: null } } } } } } },
  });
  if (!campaign) throw new NotFoundError("Campaign");
  if (!campaign.audioAsset || campaign.audioAsset.deletedAt) throw new ConflictError("Campaign requires an uploaded audio asset");
  if (!([CampaignStatus.DRAFT, CampaignStatus.AUDIO_UPLOADED, CampaignStatus.REJECTED, CampaignStatus.CHANGES_REQUESTED] as CampaignStatus[]).includes(campaign.status)) {
    throw new ConflictError("Campaign cannot be submitted from its current status");
  }
  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: CampaignStatus.PENDING_REVIEW, submittedAt: new Date(), rejectionReason: null, reviewedAt: null, reviewedById: null },
    include: { audioAsset: true, company: { select: { id: true, name: true } } },
  });
  await notifyPlatform({
    type: "CAMPAIGN_SUBMITTED",
    title: "New campaign submitted",
    message: `${updated.company.name}: ${updated.name}`,
    metadata: { campaignId: updated.id, companyId: updated.companyId, estimatedCalls: campaign.contactGroup._count.contacts },
  });
  return updated;
}

export async function reviewCampaign(campaignId: string, reviewerId: string, decision: ModerationDecision, reason?: string | null) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, deletedAt: null }, include: { audioAsset: true } });
  if (!campaign) throw new NotFoundError("Campaign");
  if (campaign.status !== CampaignStatus.PENDING_REVIEW) throw new ConflictError("Only pending campaigns can be reviewed");
  if (decision === ModerationDecision.APPROVED && campaign.audioAsset?.status !== AudioReviewStatus.APPROVED) {
    throw new ConflictError("Campaign audio must be approved first");
  }
  if (decision !== ModerationDecision.APPROVED && !reason?.trim()) throw new ConflictError("A review reason is required");
  const status = decision === ModerationDecision.APPROVED
    ? CampaignStatus.APPROVED
    : decision === ModerationDecision.REJECTED ? CampaignStatus.REJECTED : CampaignStatus.CHANGES_REQUESTED;
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.campaign.update({
      where: { id: campaign.id },
      data: { status, rejectionReason: reason?.trim() || null, reviewedAt: new Date(), reviewedById: reviewerId },
    });
    await tx.moderationReview.create({
      data: { subjectType: ModerationSubjectType.CAMPAIGN, decision, reason: reason?.trim() || null, companyId: campaign.companyId, campaignId, reviewerId },
    });
    return item;
  });
  await notifyCompany(campaign.companyId, {
    type: `CAMPAIGN_${decision}`,
    title: `Campaign ${decision.toLowerCase().replace("_", " ")}`,
    message: reason?.trim() || campaign.name,
    metadata: { campaignId, decision },
  });
  return updated;
}

export async function reviewAudioAsset(audioAssetId: string, reviewerId: string, decision: ModerationDecision, reason?: string | null) {
  if (decision === ModerationDecision.CHANGES_REQUESTED) throw new ConflictError("Audio review supports approve or reject decisions");
  const audio = await prisma.audioAsset.findFirst({ where: { id: audioAssetId, deletedAt: null } });
  if (!audio) throw new NotFoundError("Audio asset");
  if (audio.status !== AudioReviewStatus.PENDING_REVIEW) throw new ConflictError("Only pending audio can be reviewed");
  if (decision === ModerationDecision.REJECTED && !reason?.trim()) throw new ConflictError("A rejection reason is required");
  const status = decision === ModerationDecision.APPROVED ? AudioReviewStatus.APPROVED : AudioReviewStatus.REJECTED;
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.audioAsset.update({
      where: { id: audio.id },
      data: { status, rejectionReason: reason?.trim() || null, reviewedAt: new Date(), reviewedById: reviewerId },
    });
    await tx.moderationReview.create({
      data: { subjectType: ModerationSubjectType.AUDIO, decision, reason: reason?.trim() || null, companyId: audio.companyId, audioAssetId, reviewerId },
    });
    return item;
  });
  await notifyCompany(audio.companyId, {
    type: `AUDIO_${decision}`,
    title: `Audio ${decision.toLowerCase()}`,
    message: reason?.trim() || audio.originalName,
    metadata: { audioAssetId, decision },
  });
  return updated;
}
