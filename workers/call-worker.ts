import { CallStatus, CampaignStatus } from "@prisma/client";
import { DelayedError, Worker, type Job } from "bullmq";
import { createLeadFromCall, launchCampaign } from "@/lib/calls/pipeline";
import { prisma } from "@/lib/db/prisma";
import { CALL_QUEUE_NAME, redisConnectionOptions } from "@/lib/queue/config";
import type { CallJobData } from "@/lib/queue/call-queue";
import { getTelephonyAdapter, type TelephonyCallResult, type TelephonyCallStatus } from "@/lib/telephony";
import { getCompanySettings, parseWorkingHours } from "@/lib/settings/service";
import { notifyCompany } from "@/lib/notifications/service";

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

const scheduler = setInterval(() => void launchDueCampaigns(), 60_000);
void launchDueCampaigns();

async function processCall(job: Job<CallJobData>, token?: string) {
  const call = await prisma.call.findUnique({
    where: { id: job.data.callId },
    include: { campaign: { select: { status: true, audioUrl: true, audioAsset: { select: { url: true } } } } },
  });
  if (!call) throw new Error(`Call ${job.data.callId} not found`);
  const settings = await getCompanySettings(call.companyId);
  if (!isWithinWorkingHours(settings.workingHours, settings.timezone)) {
    await job.moveToDelayed(Date.now() + 15 * 60_000, token);
    throw new DelayedError();
  }
  const activeCalls = await prisma.call.count({ where: { companyId: call.companyId, status: CallStatus.CALLING } });
  if (activeCalls >= settings.concurrentCallLimit) {
    await job.moveToDelayed(Date.now() + 5_000, token);
    throw new DelayedError();
  }
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
    result = await telephony.call(call.phone, call.campaign.audioAsset?.url ?? call.campaign.audioUrl);
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
  const retryAllowed = status === CallStatus.BUSY ? settings.retryBusy : status === CallStatus.NOT_ANSWERED ? settings.retryUnanswered : settings.retryFailed;
  const willRetry = status !== CallStatus.ANSWERED && retryAllowed && hasAttemptsRemaining(job);

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

function isWithinWorkingHours(value: Parameters<typeof parseWorkingHours>[0], timezone: string) {
  const workingHours = parseWorkingHours(value);
  if (!workingHours.enabled) return true;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const weekday = parts.find(({ type }) => type === "weekday")?.value ?? "Sun";
  const hour = parts.find(({ type }) => type === "hour")?.value ?? "00";
  const minute = parts.find(({ type }) => type === "minute")?.value ?? "00";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const time = `${hour}:${minute}`;
  if (!workingHours.days.includes(day)) return false;
  return workingHours.start <= workingHours.end ? time >= workingHours.start && time <= workingHours.end : time >= workingHours.start || time <= workingHours.end;
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
  if (!openCalls) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { companyId: true, name: true, status: true } });
    if (campaign?.status === CampaignStatus.RUNNING) {
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: CampaignStatus.COMPLETED } });
      await notifyCompany(campaign.companyId, { type: "CAMPAIGN_COMPLETED", title: "Campaign completed", message: campaign.name, metadata: { campaignId } });
    }
  }
}

async function launchDueCampaigns() {
  const campaigns = await prisma.campaign.findMany({
    where: { deletedAt: null, status: CampaignStatus.SCHEDULED, startTime: { lte: new Date() } },
    select: { id: true },
    take: 100,
  });
  for (const campaign of campaigns) {
    await launchCampaign(campaign.id).catch((error) => console.error(`Scheduled campaign ${campaign.id} failed`, error));
  }
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}; closing call worker`);
  clearInterval(scheduler);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
