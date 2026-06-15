import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { AuthUser } from "@/types/auth";

export async function recordAudit(input: {
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  user?: AuthUser | null;
  request?: NextRequest;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata,
        userId: input.user?.id,
        companyId: input.user?.companyId ?? undefined,
        ipAddress: input.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: input.request?.headers.get("user-agent"),
      },
    });
  } catch (error) {
    console.error("Failed to record audit log", error);
  }
}
