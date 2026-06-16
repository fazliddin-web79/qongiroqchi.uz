import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOptionalApiUser } from "@/lib/auth/api";

export async function recordError(error: unknown, request: NextRequest, statusCode = 500) {
  try {
    const value = error instanceof Error ? error : new Error(String(error));
    const user = await getOptionalApiUser(request);
    await prisma.errorLog.create({
      data: {
        message: value.message,
        stack: value.stack,
        route: request.nextUrl.pathname,
        method: request.method,
        statusCode,
        userId: user?.id,
        companyId: user?.impersonatedCompanyId ?? user?.companyId ?? undefined,
        context: { query: Object.fromEntries(request.nextUrl.searchParams.entries()) },
      },
    });
  } catch (logError) {
    console.error("Failed to record backend error", logError);
  }
}
