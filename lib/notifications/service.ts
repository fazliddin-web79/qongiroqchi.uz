import { NotificationAudience, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type NotificationInput = {
  type: string;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export function notifyPlatform(input: NotificationInput) {
  return prisma.notification.create({ data: { ...input, audience: NotificationAudience.PLATFORM } });
}

export function notifyCompany(companyId: string, input: NotificationInput) {
  return prisma.notification.create({ data: { ...input, companyId, audience: NotificationAudience.COMPANY } });
}

export function notifyUser(recipientUserId: string, input: NotificationInput) {
  return prisma.notification.create({ data: { ...input, recipientUserId, audience: NotificationAudience.USER } });
}
