import { AudioReviewStatus, Prisma } from "@prisma/client";
import { withApiHandler } from "@/lib/api/handler";
import { paginationFrom, paginationMeta } from "@/lib/api/query";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { companyWhereForRequest } from "@/lib/modules/scope";
import { PERMISSION } from "@/lib/permissions/constants";

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.AUDIO_READ);
  const { page, limit, skip } = paginationFrom(request);
  const companyId = request.nextUrl.searchParams.get("companyId");
  const statusValue = request.nextUrl.searchParams.get("status");
  const status = statusValue && Object.values(AudioReviewStatus).includes(statusValue as AudioReviewStatus) ? statusValue as AudioReviewStatus : undefined;
  const where: Prisma.AudioAssetWhereInput = { deletedAt: null, ...companyWhereForRequest(auth, companyId), ...(status ? { status } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.audioAsset.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { company: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } }, reviewedBy: { select: { id: true, name: true } } } }),
    prisma.audioAsset.count({ where }),
  ]);
  return apiSuccess({ items, pagination: paginationMeta(total, page, limit) });
});
