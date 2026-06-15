import type { ConnectionOptions } from "bullmq";

export const CALL_QUEUE_NAME = "autocall-calls";

export function redisConnectionOptions(worker = false): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  const db = Number(url.pathname.replace("/", "") || "0");

  return {
    host: url.hostname,
    port: Number(url.port || "6379"),
    username: url.username || undefined,
    password: url.password || undefined,
    db,
    tls: url.protocol === "rediss:" ? {} : undefined,
    connectTimeout: 3_000,
    enableReadyCheck: false,
    maxRetriesPerRequest: worker ? null : 1,
    retryStrategy: worker ? (attempts) => Math.min(attempts * 500, 5_000) : () => null,
  };
}
