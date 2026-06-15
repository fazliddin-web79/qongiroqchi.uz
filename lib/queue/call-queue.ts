import { Queue, type Job, type JobState } from "bullmq";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";
import { CALL_QUEUE_NAME, redisConnectionOptions } from "./config";

export type CallJobData = {
  callId: string;
  companyId: string;
  campaignId: string;
  campaignName: string;
  phone: string;
  audioUrl: string | null;
};

type GlobalQueue = typeof globalThis & { autocallQueue?: Queue<CallJobData> };
let lastQueueErrorAt = 0;

export function getCallQueue() {
  const globalQueue = globalThis as GlobalQueue;
  if (!globalQueue.autocallQueue) {
    globalQueue.autocallQueue = new Queue<CallJobData>(CALL_QUEUE_NAME, {
      connection: redisConnectionOptions(),
      defaultJobOptions: {
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: { count: 1_000 },
        removeOnFail: { count: 1_000 },
      },
    });
    globalQueue.autocallQueue.on("error", (error) => {
      if (Date.now() - lastQueueErrorAt < 5_000) return;
      lastQueueErrorAt = Date.now();
      console.error("Call queue error", error.message);
    });
  }
  return globalQueue.autocallQueue;
}

export async function enqueueCampaignCalls(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      companyId: true,
      name: true,
      audioUrl: true,
      retryEnabled: true,
      retryCount: true,
      calls: {
        where: { status: "PENDING" },
        select: { id: true, phone: true },
      },
    },
  });
  if (!campaign) throw new NotFoundError("Campaign");

  const queue = getCallQueue();
  const jobs = await queue.addBulk(campaign.calls.map((call) => ({
    name: "place-call",
    data: {
      callId: call.id,
      companyId: campaign.companyId,
      campaignId: campaign.id,
      campaignName: campaign.name,
      phone: call.phone,
      audioUrl: campaign.audioUrl,
    },
    opts: {
      jobId: call.id,
      attempts: campaign.retryEnabled ? Math.max(1, campaign.retryCount + 1) : 1,
    },
  })));
  return jobs.length;
}

export async function resumeCampaignJobs(campaignId: string) {
  const queue = getCallQueue();
  const delayed = await queue.getJobs(["delayed"], 0, 999);
  const matching = delayed.filter((job) => job.data.campaignId === campaignId);
  await Promise.all(matching.map((job) => job.promote()));
  const queued = await enqueueCampaignCalls(campaignId);
  return { promoted: matching.length, queued };
}

export async function retryCallJob(jobId: string, companyId?: string | null) {
  const queue = getCallQueue();
  const job = await queue.getJob(jobId);
  if (!job || (companyId && job.data.companyId !== companyId)) throw new NotFoundError("Queue job");
  const campaign = await prisma.campaign.findUnique({ where: { id: job.data.campaignId }, select: { status: true } });
  if (campaign?.status === "PAUSED") throw new ConflictError("Resume campaign before retrying jobs");
  await prisma.call.update({ where: { id: job.data.callId }, data: { status: "PENDING", errorMessage: null, endedAt: null } });
  await prisma.campaign.updateMany({ where: { id: job.data.campaignId, status: { in: ["COMPLETED", "FAILED"] } }, data: { status: "RUNNING" } });
  await job.retry("failed");
  return serializeJob(job, "waiting");
}

export async function getQueueSnapshot(companyId?: string | null) {
  const queue = getCallQueue();
  const workers = await queue.getWorkers();
  const jobs = await queue.getJobs(["waiting", "active", "delayed", "completed", "failed"], 0, 499, false);
  const serialized = await Promise.all(jobs.filter((job) => !companyId || job.data.companyId === companyId).map(async (job) => serializeJob(job, await job.getState())));
  const counts = serialized.reduce<Record<string, number>>((result, job) => {
    result[job.state] = (result[job.state] ?? 0) + 1;
    return result;
  }, {});

  return {
    status: "CONNECTED",
    workers: workers.length,
    counts: {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      delayed: counts.delayed ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
    },
    jobs: serialized.slice(0, 100),
  };
}

function serializeJob(job: Job<CallJobData>, state: JobState | "unknown") {
  return {
    id: job.id ?? job.data.callId,
    ...job.data,
    state,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts ?? 1,
    failedReason: job.failedReason || null,
    timestamp: job.timestamp,
    processedOn: job.processedOn ?? null,
    finishedOn: job.finishedOn ?? null,
  };
}
