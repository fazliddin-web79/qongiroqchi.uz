import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/api";

export const GET = withApiHandler(async (request) => apiSuccess({ user: await requireApiAuth(request) }));
