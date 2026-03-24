import { Worker, type Job } from "bullmq";
import { QUEUE_NAME } from "@/lib/config/constants";
import { processAudioJob } from "./processors/audio-processor";

// Load environment
import "dotenv/config";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? "1", 10);

console.log(`[Worker] Starting with Redis: ${REDIS_URL}`);
console.log(`[Worker] Concurrency: ${CONCURRENCY}`);

const redisUrl = new URL(REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || "6379"),
  maxRetriesPerRequest: null,
};

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    console.log(`[Worker] Processing job ${job.id} for request ${job.data.requestId}`);

    await processAudioJob(job.data, async (progress: number) => {
      await job.updateProgress(progress);
    });

    console.log(`[Worker] Job ${job.id} completed`);
  },
  {
    connection,
    concurrency: CONCURRENCY,
  }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[Worker] Error:", err);
});

// Graceful shutdown
const shutdown = async () => {
  console.log("[Worker] Shutting down...");
  await worker.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Heartbeat
setInterval(() => {
  console.log(`[Worker] Heartbeat — active: ${worker.isRunning()}`);
}, 30000);

console.log("[Worker] Ready and waiting for jobs");
