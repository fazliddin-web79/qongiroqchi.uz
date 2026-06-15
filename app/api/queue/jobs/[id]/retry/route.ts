import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { recordAudit } from "@/lib/logging/audit-log";
import { isSuperAdmin } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions/constants";
import { retryCallJob } from "@/lib/queue/call-queue";

type Context = { params: Promise<{ id: string }> };

export const POST = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  const { id } = await params;
  const job = await retryCallJob(id, isSuperAdmin(auth) ? null : auth.companyId);
  await recordAudit({ action: "CALL_JOB_RETRY", entity: "Call", entityId: job.callId, user: auth, request, metadata: { jobId: id } });
  return apiSuccess(job, "Call job queued for retry");
});
