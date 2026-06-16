import { z } from "zod";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { signAccessToken } from "@/lib/auth/jwt";
import { setAccessCookie } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ reason: z.string().trim().min(3).max(500), durationMinutes: z.number().int().min(5).max(60).default(30) });

export const POST = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.COMPANY_IMPERSONATE);
  const { id } = await params;
  const input = schema.parse(await request.json());
  if (!(await prisma.company.findFirst({ where: { id, deletedAt: null } }))) throw new NotFoundError("Company");
  const session = await prisma.impersonationSession.create({
    data: { platformUserId: auth.id, companyId: id, reason: input.reason, expiresAt: new Date(Date.now() + input.durationMinutes * 60_000) },
  });
  const accessToken = await signAccessToken(auth.id, session.id);
  await recordAudit({ action: "COMPANY_IMPERSONATE_START", entity: "Company", entityId: id, user: auth, request, metadata: { sessionId: session.id, reason: input.reason } });
  return setAccessCookie(apiSuccess({ accessToken, session }, "Impersonation started"), accessToken);
});
