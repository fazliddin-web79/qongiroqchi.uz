import { CallStatus, CampaignStatus } from "@prisma/client";
import { DelayedError, Worker, type Job } from "bullmq";
import { createLeadFromCall } from "@/lib/calls/pipeline";
import { prisma } from "@/lib/db/prisma";
import { CALL_QUEUE_NAME, redisConnectionOptions } from "@/lib/queue/config";
import type { CallJobData } from "@/lib/queue/call-queue";
import { getTelephonyAdapter, type TelephonyCallResult, type TelephonyCallStatus } from "@/lib/telephony";

const worker = new Worker<CallJobData>(CALL_QUEUE_NAME, processCall, {
  connection: redisConnectionOptions(true),
  concurrency: Number(process.env.CALL_QUEUE_CONCURRENCY ?? "5"),
});
let lastWorkerErrorAt = 0;

worker.on("ready", () => console.log(`Call worker ready for ${CALL_QUEUE_NAME}`));
worker.on("completed", (job) => console.log(`Call job ${job.id} completed`));
worker.on("failed", (job, error) => console.error(`Call job ${job?.id ?? "unknown"} failed`, error.message));
worker.on("error", (error) => {
  if (Date.now() - lastWorkerErrorAt < 5_000) return;
  lastWorkerErrorAt = Date.now();
  console.error("Call worker error", error);
});

async function processCall(job: Job<CallJobData>, token?: string) {
  const call = await prisma.call.findUnique({
    where: { id: job.data.callId },
    include: { campaign: { select: { status: true, audioUrl: true } } },
  });
  if (!call) throw new Error(`Call ${job.data.callId} not found`);
  if (call.campaign.status === CampaignStatus.PAUSED) {
    await job.moveToDelayed(Date.now() + 15_000, token);
    throw new DelayedError();
  }
  if (call.campaign.status !== CampaignStatus.RUNNING) return { skipped: true, reason: call.campaign.status };

  await prisma.call.update({
    where: { id: call.id },
    data: {
      status: CallStatus.CALLING,
      attemptCount: { increment: 1 },
      startedAt: call.startedAt ?? new Date(),
      endedAt: null,
      errorMessage: null,
    },
  });

  const telephony = getTelephonyAdapter();
  let result: TelephonyCallResult;
  try {
    result = await telephony.call(call.phone, call.campaign.audioUrl);
  } catch (error) {
    const willRetry = hasAttemptsRemaining(job);
    await prisma.call.update({
      where: { id: call.id },
      data: {
        status: willRetry ? CallStatus.PENDING : CallStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
        endedAt: new Date(),
      },
    });
    if (!willRetry) await completeCampaignWhenFinished(call.campaignId);
    throw error;
  }
  if (result.pressedKey) await telephony.handleIvrInput(result.callId, result.pressedKey);
  const status = mapStatus(result.status);
  const willRetry = status !== CallStatus.ANSWERED && hasAttemptsRemaining(job);

  await prisma.call.update({
    where: { id: call.id },
    data: {
      providerCallId: result.callId,
      status: willRetry ? CallStatus.PENDING : status,
      duration: result.duration,
      pressedKey: result.pressedKey,
      recordingUrl: result.recordingUrl,
      errorMessage: result.errorMessage,
      endedAt: new Date(),
    },
  });
  if (result.pressedKey) await createLeadFromCall(call.id, { source: `IVR:${result.pressedKey}`, note: "Created by auto-call worker" });
  if (!willRetry) await completeCampaignWhenFinished(call.campaignId);

  if (status !== CallStatus.ANSWERED) throw new Error(result.errorMessage ?? `Call finished with ${result.status}`);
  return { status, providerCallId: result.callId, pressedKey: result.pressedKey ?? null };
}

function hasAttemptsRemaining(job: Job<CallJobData>) {
  return job.attemptsMade + 1 < (job.opts.attempts ?? 1);
}

function mapStatus(status: TelephonyCallStatus) {
  if (status === "answered") return CallStatus.ANSWERED;
  if (status === "not_answered") return CallStatus.NOT_ANSWERED;
  if (status === "busy") return CallStatus.BUSY;
  return CallStatus.FAILED;
}

async function completeCampaignWhenFinished(campaignId: string) {
  const openCalls = await prisma.call.count({ where: { campaignId, status: { in: [CallStatus.PENDING, CallStatus.CALLING] } } });
  if (!openCalls) await prisma.campaign.updateMany({ where: { id: campaignId, status: CampaignStatus.RUNNING }, data: { status: CampaignStatus.COMPLETED } });
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}; closing call worker`);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
