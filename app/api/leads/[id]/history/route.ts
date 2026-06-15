import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { NotFoundError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";
import { leadWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };

export const GET = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.LEAD_READ);
  const { id } = await params;
  if (!(await prisma.lead.findFirst({ where: { id, deletedAt: null, ...leadWhere(auth) } }))) throw new NotFoundError("Lead");
  const history = await prisma.leadHistory.findMany({ where: { leadId: id, deletedAt: null }, orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, name: true } } } });
  return apiSuccess(history);
});
