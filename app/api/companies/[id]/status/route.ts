import { CompanyStatus } from "@prisma/client";
import { z } from "zod";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.nativeEnum(CompanyStatus), reason: z.string().trim().max(2000).nullable().optional() });

export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.COMPANY_SUSPEND);
  const { id } = await params;
  const input = schema.parse(await request.json());
  if (!(await prisma.company.findFirst({ where: { id, deletedAt: null } }))) throw new NotFoundError("Company");
  const company = await prisma.company.update({
    where: { id },
    data: {
      status: input.status,
      suspendedAt: input.status === CompanyStatus.SUSPENDED ? new Date() : null,
      suspensionReason: input.status === CompanyStatus.SUSPENDED ? input.reason?.trim() || null : null,
    },
  });
  await recordAudit({ action: `COMPANY_${input.status}`, entity: "Company", entityId: id, user: auth, request, metadata: { reason: input.reason } });
  return apiSuccess(company, `Company ${input.status.toLowerCase()}`);
});
