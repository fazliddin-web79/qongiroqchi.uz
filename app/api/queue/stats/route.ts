import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";
import { isSuperAdmin } from "@/lib/permissions";
import { ROLES } from "@/lib/permissions/constants";
import { getQueueSnapshot } from "@/lib/queue/call-queue";

export const GET = withApiHandler(async (request) => {
  const auth = await requireApiAuth(request, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  const requestedCompanyId = request.nextUrl.searchParams.get("companyId");
  const companyId = isSuperAdmin(auth) ? requestedCompanyId : auth.companyId;
  return apiSuccess(await getQueueSnapshot(companyId), "Queue status loaded");
});
