import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { isPlatformUser } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";
import { getQueueSnapshot } from "@/lib/queue/call-queue";

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.QUEUE_READ);
  const requestedCompanyId = request.nextUrl.searchParams.get("companyId");
  const companyId = auth.impersonatedCompanyId ?? (isPlatformUser(auth) ? requestedCompanyId : auth.companyId);
  return apiSuccess(await getQueueSnapshot(companyId), "Queue status loaded");
});
