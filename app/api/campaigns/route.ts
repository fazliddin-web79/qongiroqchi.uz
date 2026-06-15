import { CampaignStatus, Prisma } from "@prisma/client";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { paginationFrom, paginationMeta } from "@/lib/api/query";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { assertCampaignSchedule, createCampaignSchema, parseStartTime } from "@/lib/campaigns/validation";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyIdForWrite, companyWhereForRequest } from "@/lib/modules/scope";
import { PERMISSION } from "@/lib/permissions/constants";
import { assertCampaignLimit } from "@/lib/billing/service";
import { getCompanySettings } from "@/lib/settings/service";

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.CAMPAIGN_READ);
  const { page, limit, skip } = paginationFrom(request);
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const contactGroupId = request.nextUrl.searchParams.get("contactGroupId");
  const statusValue = request.nextUrl.searchParams.get("status");
  const companyId = request.nextUrl.searchParams.get("companyId");
  const status = statusValue && Object.values(CampaignStatus).includes(statusValue as CampaignStatus) ? statusValue as CampaignStatus : undefined;
  const where: Prisma.CampaignWhereInput = {
    deletedAt: null,
    ...companyWhereForRequest(auth, companyId),
    ...(contactGroupId ? { contactGroupId } : {}),
    ...(status ? { status } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.campaign.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { contactGroup: { select: { id: true, name: true, _count: { select: { contacts: { where: { deletedAt: null } } } } } }, createdBy: { select: { id: true, name: true } }, company: { select: { id: true, name: true } } } }),
    prisma.campaign.count({ where }),
  ]);
  return apiSuccess({ items, pagination: paginationMeta(total, page, limit) });
});

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.CAMPAIGN_CREATE);
  const input = createCampaignSchema.parse(await request.json());
  const companyId = companyIdForWrite(auth, input.companyId);
  await assertCampaignLimit(companyId);
  if (!(await prisma.contactGroup.findFirst({ where: { id: input.contactGroupId, companyId, deletedAt: null } }))) throw new NotFoundError("Contact group");
  const settings = await getCompanySettings(companyId);
  const startTime = parseStartTime(input.startTime);
  assertCampaignSchedule(input.status, startTime);
  const campaign = await prisma.campaign.create({
    data: {
      companyId,
      name: input.name,
      description: input.description,
      audioUrl: input.audioUrl,
      contactGroupId: input.contactGroupId,
      status: input.status,
      startTime,
      retryEnabled: input.retryEnabled,
      retryCount: input.retryEnabled ? input.retryCount || settings.defaultRetryCount : 0,
      ivrSettings: input.ivrSettings as Prisma.InputJsonValue,
      createdById: auth.id,
    },
    include: { contactGroup: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
  });
  await recordAudit({ action: "CAMPAIGN_CREATE", entity: "Campaign", entityId: campaign.id, user: auth, request });
  return apiSuccess(campaign, "Campaign created", 201);
});
