import { CallStatus, Prisma } from "@prisma/client";
import { withApiHandler } from "@/lib/api/handler";
import { paginationFrom, paginationMeta } from "@/lib/api/query";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { companyWhereForRequest } from "@/lib/modules/scope";
import { PERMISSION } from "@/lib/permissions/constants";

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.CALL_READ);
  const { page, limit, skip } = paginationFrom(request);
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const campaignId = request.nextUrl.searchParams.get("campaignId");
  const companyId = request.nextUrl.searchParams.get("companyId");
  const statusValue = request.nextUrl.searchParams.get("status");
  const status = statusValue && Object.values(CallStatus).includes(statusValue as CallStatus) ? statusValue as CallStatus : undefined;
  const where: Prisma.CallWhereInput = {
    ...companyWhereForRequest(auth, companyId),
    ...(campaignId ? { campaignId } : {}),
    ...(status ? { status } : {}),
    ...(search ? { OR: [{ phone: { contains: search } }, { contact: { fullName: { contains: search, mode: "insensitive" } } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.call.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { contact: { select: { id: true, fullName: true, phone: true } }, campaign: { select: { id: true, name: true } }, lead: { select: { id: true, status: true } }, company: { select: { id: true, name: true } } } }),
    prisma.call.count({ where }),
  ]);
  return apiSuccess({ items, pagination: paginationMeta(total, page, limit) });
});
