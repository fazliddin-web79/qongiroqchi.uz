import { CampaignStatus, ContactStatus, LeadStatus, RoleName } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";

export async function launchCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, deletedAt: null },
    include: { contactGroup: { include: { contacts: { where: { deletedAt: null, status: ContactStatus.ACTIVE }, select: { id: true, phone: true } } } } },
  });
  if (!campaign) throw new NotFoundError("Campaign");
  if (campaign.status === CampaignStatus.COMPLETED) throw new ConflictError("Completed campaign cannot be started again");
  if (!campaign.contactGroup.contacts.length) throw new ConflictError("Campaign contact group has no active contacts");

  const created = await prisma.call.createMany({
    data: campaign.contactGroup.contacts.map((contact) => ({ companyId: campaign.companyId, campaignId: campaign.id, contactId: contact.id, phone: contact.phone })),
    skipDuplicates: true,
  });
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: CampaignStatus.RUNNING, startTime: campaign.startTime ?? new Date() } });
  return { campaignId: campaign.id, createdCalls: created.count, totalContacts: campaign.contactGroup.contacts.length };
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
  return { lead, created: true };
}
