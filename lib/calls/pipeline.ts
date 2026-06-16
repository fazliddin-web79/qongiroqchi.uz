import { AudioReviewStatus, CampaignStatus, CompanyStatus, ContactStatus, LeadStatus, RoleName } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";
import { enqueueCampaignCalls } from "@/lib/queue/call-queue";
import { assertCallLimit } from "@/lib/billing/service";
import { notifyNewLead } from "@/lib/telegram/service";
import { getCompanySettings } from "@/lib/settings/service";

export async function launchCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, deletedAt: null },
    include: { audioAsset: true, company: true, contactGroup: { include: { contacts: { where: { deletedAt: null, status: ContactStatus.ACTIVE }, select: { id: true, phone: true } } } } },
  });
  if (!campaign) throw new NotFoundError("Campaign");
  if (campaign.company.status !== CompanyStatus.ACTIVE) throw new ConflictError("Suspended companies cannot launch campaigns");
  if (!([CampaignStatus.APPROVED, CampaignStatus.SCHEDULED] as CampaignStatus[]).includes(campaign.status)) throw new ConflictError("Campaign must be approved before launch");
  if (campaign.startTime && campaign.startTime > new Date()) throw new ConflictError("Scheduled campaign is not due yet");
  if (!campaign.audioAsset || campaign.audioAsset.status !== AudioReviewStatus.APPROVED) throw new ConflictError("Campaign audio must be approved before launch");
  if (!campaign.contactGroup.contacts.length) throw new ConflictError("Campaign contact group has no active contacts");
  const existingContacts = await prisma.call.findMany({ where: { campaignId: campaign.id }, select: { contactId: true } });
  const existingIds = new Set(existingContacts.map(({ contactId }) => contactId));
  await assertCallLimit(campaign.companyId, campaign.contactGroup.contacts.filter(({ id }) => !existingIds.has(id)).length);
  const settings = await getCompanySettings(campaign.companyId);
  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
  const callsToday = await prisma.call.count({ where: { companyId: campaign.companyId, createdAt: { gte: startOfDay } } });
  if (callsToday + campaign.contactGroup.contacts.length > settings.dailyCallLimit) throw new ConflictError("Company daily call limit would be exceeded");

  const created = await prisma.call.createMany({
    data: campaign.contactGroup.contacts.map((contact) => ({ companyId: campaign.companyId, campaignId: campaign.id, contactId: contact.id, phone: contact.phone })),
    skipDuplicates: true,
  });
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: CampaignStatus.RUNNING, startTime: campaign.startTime ?? new Date() } });
  try {
    const queuedJobs = await enqueueCampaignCalls(campaign.id);
    return { campaignId: campaign.id, createdCalls: created.count, queuedJobs, totalContacts: campaign.contactGroup.contacts.length };
  } catch (error) {
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: CampaignStatus.FAILED } });
    throw error;
  }
}

async function leastBusyOperator(companyId: string) {
  const operators = await prisma.user.findMany({
    where: { companyId, deletedAt: null, roles: { some: { deletedAt: null, role: { name: RoleName.OPERATOR, deletedAt: null } } } },
    select: { id: true, _count: { select: { assignedLeads: { where: { deletedAt: null, status: { not: LeadStatus.ARCHIVED } } } } } },
  });
  return operators.sort((left, right) => left._count.assignedLeads - right._count.assignedLeads)[0]?.id ?? null;
}

export async function createLeadFromCall(callId: string, input?: { source?: string; note?: string | null; assignedToId?: string | null; actorId?: string | null }) {
  const existing = await prisma.lead.findUnique({ where: { callId } });
  if (existing && !existing.deletedAt) return { lead: existing, created: false };
  if (existing?.deletedAt) {
    const lead = await prisma.lead.update({ where: { id: existing.id }, data: { deletedAt: null, status: LeadStatus.NEW, source: input?.source ?? existing.source, note: input?.note ?? existing.note } });
    await prisma.leadHistory.create({ data: { leadId: lead.id, userId: input?.actorId, action: "LEAD_RESTORE", fromStatus: existing.status, toStatus: LeadStatus.NEW, note: input?.note } });
    return { lead, created: true };
  }
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new NotFoundError("Call");
  const assignedToId = input?.assignedToId === undefined ? await leastBusyOperator(call.companyId) : input.assignedToId;
  const lead = await prisma.lead.create({
    data: {
      companyId: call.companyId,
      campaignId: call.campaignId,
      contactId: call.contactId,
      callId: call.id,
      source: input?.source ?? "IVR",
      assignedToId,
      note: input?.note,
      history: { create: { action: "LEAD_CREATE", toStatus: LeadStatus.NEW, note: input?.note, userId: input?.actorId } },
    },
  });
  await notifyNewLead(lead.id);
  return { lead, created: true };
}
