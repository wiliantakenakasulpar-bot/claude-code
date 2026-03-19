import { Queue, Worker, Job, QueueEvents } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "localhost",
      port: parseInt(parsed.port || "6379", 10),
      password: parsed.password || undefined,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
    };
  } catch {
    return { host: "localhost", port: 6379, maxRetriesPerRequest: null as null, enableReadyCheck: false };
  }
}

// Parse Redis URL
function getRedisConnection() {
  return parseRedisUrl(REDIS_URL);
}

export const QUEUE_NAME = "image-processing";

// Queue for adding jobs (client-side)
let imageQueue: Queue | null = null;
let queueEvents: QueueEvents | null = null;

export function getImageQueue(): Queue {
  if (!imageQueue) {
    const connection = getRedisConnection();
    imageQueue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return imageQueue;
}

export function getQueueEvents(): QueueEvents {
  if (!queueEvents) {
    const connection = getRedisConnection();
    queueEvents = new QueueEvents(QUEUE_NAME, { connection });
  }
  return queueEvents;
}

export interface ImageProcessingJobData {
  imageId: string;
  userId: string;
  originalPath: string;
  backgroundType: string;
  quality: string;
  format: string;
  autoOcr: boolean;
}

export async function addImageProcessingJob(data: ImageProcessingJobData): Promise<string> {
  const queue = getImageQueue();
  const job = await queue.add("process-image", data, {
    priority: 1,
  });
  return job.id!;
}

export async function getJobStatus(jobId: string): Promise<{
  status: string;
  progress: number;
  result?: unknown;
  error?: string;
} | null> {
  const queue = getImageQueue();
  const job = await Job.fromId(queue, jobId);
  if (!job) return null;

  const state = await job.getState();
  return {
    status: state,
    progress: typeof job.progress === "number" ? job.progress : 0,
    result: job.returnvalue,
    error: job.failedReason,
  };
}

export { getRedisConnection };
