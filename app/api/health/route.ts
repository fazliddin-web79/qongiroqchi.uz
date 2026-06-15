import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

export const GET = withApiHandler(async () => {
  await prisma.$queryRaw`SELECT 1`;
  return apiSuccess({ status: "ok", database: "connected" }, "API is healthy");
});
