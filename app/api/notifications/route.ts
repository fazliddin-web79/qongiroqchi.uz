import { NotificationAudience, Prisma } from "@prisma/client";
import { withApiHandler } from "@/lib/api/handler";
import { paginationFrom, paginationMeta } from "@/lib/api/query";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { isPlatformUser } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.NOTIFICATION_READ);
  const { page, limit, skip } = paginationFrom(request);
  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
  const effectiveCompanyId = auth.impersonatedCompanyId ?? auth.companyId;
  const where: Prisma.NotificationWhereInput = {
    deletedAt: null,
    ...(unreadOnly ? { readAt: null } : {}),
    OR: effectiveCompanyId
      ? [{ audience: NotificationAudience.COMPANY, companyId: effectiveCompanyId }, { audience: NotificationAudience.USER, recipientUserId: auth.id }]
      : isPlatformUser(auth)
        ? [{ audience: NotificationAudience.PLATFORM }, { audience: NotificationAudience.USER, recipientUserId: auth.id }]
        : [{ audience: NotificationAudience.USER, recipientUserId: auth.id }],
  };
  const [items, total] = await prisma.$transaction([
    prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.notification.count({ where }),
  ]);
  return apiSuccess({ items, pagination: paginationMeta(total, page, limit) });
});
