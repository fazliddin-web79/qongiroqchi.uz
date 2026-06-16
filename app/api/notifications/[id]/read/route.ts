import { NotificationAudience } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { isPlatformUser } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.NOTIFICATION_READ);
  const { id } = await params;
  const item = await prisma.notification.findFirst({ where: { id, deletedAt: null } });
  if (!item) throw new NotFoundError("Notification");
  const companyId = auth.impersonatedCompanyId ?? auth.companyId;
  const canRead = item.recipientUserId === auth.id
    || (item.audience === NotificationAudience.PLATFORM && isPlatformUser(auth) && !auth.impersonatedCompanyId)
    || (item.audience === NotificationAudience.COMPANY && item.companyId === companyId);
  if (!canRead) throw new ForbiddenError();
  return apiSuccess(await prisma.notification.update({ where: { id }, data: { readAt: new Date() } }), "Notification marked as read");
});
