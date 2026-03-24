import { Queue, type ConnectionOptions } from "bullmq";
import { QUEUE_NAME, JOB_OPTIONS } from "@/lib/config/constants";
import { getEnv } from "@/lib/config/env";

let _queue: Queue | null = null;

function getRedisOpts(): ConnectionOptions {
  const url = new URL(getEnv().REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379"),
    maxRetriesPerRequest: null,
  };
}

export function getQueue(): Queue {
  if (_queue) return _queue;
  _queue = new Queue(QUEUE_NAME, {
    connection: getRedisOpts(),
  });
  return _queue;
}

export async function enqueueProcessingJob(requestId: string): Promise<string> {
  const queue = getQueue();
  const job = await queue.add(
    "process-audio",
    { requestId },
    {
      ...JOB_OPTIONS,
      jobId: requestId,
    }
  );
  return job.id ?? requestId;
}
