import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { recordAudit } from "@/lib/logging/audit-log";
import { isPlatformUser } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";
import { retryCallJob } from "@/lib/queue/call-queue";

type Context = { params: Promise<{ id: string }> };

export const POST = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.QUEUE_UPDATE);
  const { id } = await params;
  const job = await retryCallJob(id, auth.impersonatedCompanyId ?? (isPlatformUser(auth) ? null : auth.companyId));
  await recordAudit({ action: "CALL_JOB_RETRY", entity: "Call", entityId: job.callId, user: auth, request, metadata: { jobId: id } });
  return apiSuccess(job, "Call job queued for retry");
});
