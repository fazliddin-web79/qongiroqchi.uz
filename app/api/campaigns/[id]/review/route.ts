import { ModerationDecision } from "@prisma/client";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { recordAudit } from "@/lib/logging/audit-log";
import { reviewCampaign } from "@/lib/moderation/service";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ decision: z.nativeEnum(ModerationDecision), reason: z.string().trim().max(2000).nullable().optional() });

export const POST = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CAMPAIGN_REVIEW);
  const { id } = await params;
  const input = schema.parse(await request.json());
  const campaign = await reviewCampaign(id, auth.id, input.decision, input.reason);
  await recordAudit({ action: `CAMPAIGN_${input.decision}`, entity: "Campaign", entityId: id, user: auth, request, metadata: { reason: input.reason } });
  return apiSuccess(campaign, `Campaign ${input.decision.toLowerCase().replace("_", " ")}`);
});
