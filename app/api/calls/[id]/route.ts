import { CallStatus } from "@prisma/client";
import { z } from "zod";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { createLeadFromCall } from "@/lib/calls/pipeline";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyWhere } from "@/lib/permissions";
import { PERMISSION } from "@/lib/permissions/constants";

type Context = { params: Promise<{ id: string }> };
const terminalStatuses: CallStatus[] = [CallStatus.ANSWERED, CallStatus.NOT_ANSWERED, CallStatus.BUSY, CallStatus.FAILED, CallStatus.COMPLETED];
const schema = z.object({
  status: z.nativeEnum(CallStatus).optional(),
  duration: z.number().int().min(0).optional(),
  pressedKey: z.string().trim().max(10).nullable().optional(),
  recordingUrl: z.string().trim().max(500).nullable().optional(),
  errorMessage: z.string().trim().max(1000).nullable().optional(),
  attemptCount: z.number().int().min(0).max(100).optional(),
  startedAt: z.string().datetime().nullable().optional(),
  endedAt: z.string().datetime().nullable().optional(),
  createLead: z.boolean().optional(),
});

export const GET = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CALL_READ);
  const { id } = await params;
  const call = await prisma.call.findFirst({ where: { id, ...companyWhere(auth) }, include: { contact: true, campaign: { select: { id: true, name: true } }, lead: { include: { assignedTo: { select: { id: true, name: true } } } }, company: { select: { id: true, name: true } } } });
  if (!call) throw new NotFoundError("Call");
  return apiSuccess(call);
});

export const PATCH = withApiHandler<Context>(async (request, { params }) => {
  const auth = await requireApiPermission(request, PERMISSION.CALL_UPDATE);
  const { id } = await params;
  const input = schema.parse(await request.json());
  const existing = await prisma.call.findFirst({ where: { id, ...companyWhere(auth) } });
  if (!existing) throw new NotFoundError("Call");
  const startedAt = input.startedAt === undefined ? (input.status === CallStatus.CALLING && !existing.startedAt ? new Date() : undefined) : (input.startedAt ? new Date(input.startedAt) : null);
  const endedAt = input.endedAt === undefined ? (input.status && terminalStatuses.includes(input.status) && !existing.endedAt ? new Date() : undefined) : (input.endedAt ? new Date(input.endedAt) : null);
  const duration = input.duration ?? (endedAt instanceof Date && (startedAt instanceof Date || existing.startedAt) ? Math.max(0, Math.round((endedAt.getTime() - (startedAt instanceof Date ? startedAt : existing.startedAt!).getTime()) / 1000)) : undefined);
  const call = await prisma.call.update({ where: { id }, data: { status: input.status, duration, pressedKey: input.pressedKey, recordingUrl: input.recordingUrl, errorMessage: input.errorMessage, attemptCount: input.attemptCount, startedAt, endedAt }, include: { contact: { select: { id: true, fullName: true, phone: true } }, campaign: { select: { id: true, name: true } }, lead: true } });
  let lead = call.lead;
  if ((input.pressedKey || input.createLead) && !lead) lead = (await createLeadFromCall(id, { source: input.pressedKey ? `IVR:${input.pressedKey}` : "CALL_INTEREST", actorId: auth.id })).lead;
  await recordAudit({ action: "CALL_UPDATE", entity: "Call", entityId: id, user: auth, request, metadata: { status: input.status ?? existing.status, leadCreated: Boolean(lead) } });
  return apiSuccess({ ...call, lead }, "Call updated");
});
