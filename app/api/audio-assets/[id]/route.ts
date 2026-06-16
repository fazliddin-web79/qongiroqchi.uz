import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { companyWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };

export const GET = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.AUDIO_READ);
  const { id } = await params;
  const item = await prisma.audioAsset.findFirst({
    where: { id, deletedAt: null, ...companyWhere(auth) },
    include: { company: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } }, reviewedBy: { select: { id: true, name: true } }, moderationReviews: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, include: { reviewer: { select: { id: true, name: true } } } } },
  });
  if (!item) throw new NotFoundError("Audio asset");
  return apiSuccess(item);
});
