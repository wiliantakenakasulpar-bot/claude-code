/**
 * Image Processing Worker
 * Run with: npm run worker
 */
import dotenv from "dotenv";
dotenv.config();

import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import { processAutomotiveImage } from "../lib/ai";
import type { ImageProcessingJobData } from "../lib/queue";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const QUEUE_NAME = "image-processing";

const prisma = new PrismaClient();

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

async function processImageJob(job: Job<ImageProcessingJobData>): Promise<void> {
  const { imageId, userId, originalPath, backgroundType, quality, format, autoOcr } = job.data;

  console.log(`[Worker] Processing job ${job.id} for image ${imageId}`);

  // Update job to processing
  await prisma.processingJob.upsert({
    where: { imageId },
    create: {
      imageId,
      jobId: job.id,
      status: "processing",
      progress: 0,
      step: "Iniciando...",
      startedAt: new Date(),
    },
    update: {
      jobId: job.id,
      status: "processing",
      progress: 0,
      step: "Iniciando...",
      startedAt: new Date(),
    },
  });

  await prisma.image.update({
    where: { id: imageId },
    data: { status: "processing" },
  });

  const onProgress = async (step: string, progress: number) => {
    await job.updateProgress(progress);
    await prisma.processingJob.update({
      where: { imageId },
      data: { step, progress },
    });
    console.log(`[Worker] Job ${job.id}: ${step} (${progress}%)`);
  };

  try {
    // Read original image
    const originalFullPath = path.join(UPLOAD_DIR, originalPath);
    const imageBuffer = await fs.readFile(originalFullPath);

    // Process image
    const result = await processAutomotiveImage(imageBuffer, {
      backgroundType: backgroundType as "white" | "studio" | "outdoor",
      quality: quality as "high" | "ultra",
      format: format as "jpg" | "png",
      autoOcr,
    }, onProgress);

    // Determine file naming
    const ext = format === "png" ? ".png" : ".jpg";

    // Get sequence number for this vehicle/plate
    let sequenceNumber = 1;
    if (result.plateDetected) {
      const existingCount = await prisma.image.count({
        where: {
          userId,
          plateDetected: result.plateDetected,
          status: "completed",
          id: { not: imageId },
        },
      });
      sequenceNumber = existingCount + 1;
    }

    const finalName = result.plateDetected
      ? `${result.plateDetected}_${String(sequenceNumber).padStart(2, "0")}${ext}`
      : `IMG_${imageId.slice(-8)}_${String(sequenceNumber).padStart(2, "0")}${ext}`;

    // Save processed image
    const processedDir = path.join(UPLOAD_DIR, userId, "processed");
    await fs.mkdir(processedDir, { recursive: true });
    const processedFilename = `${imageId}_processed${ext}`;
    const processedFullPath = path.join(processedDir, processedFilename);
    await fs.writeFile(processedFullPath, result.processedBuffer);

    // Save thumbnail
    const thumbnailDir = path.join(UPLOAD_DIR, userId, "thumbnails");
    await fs.mkdir(thumbnailDir, { recursive: true });
    const thumbnailFilename = `${imageId}_thumb.jpg`;
    const thumbnailFullPath = path.join(thumbnailDir, thumbnailFilename);
    await fs.writeFile(thumbnailFullPath, result.thumbnailBuffer);

    const processedPath = path.join(userId, "processed", processedFilename);
    const thumbnailPath = path.join(userId, "thumbnails", thumbnailFilename);

    // Find or create vehicle for this plate
    let vehicleId: string | undefined;
    if (result.plateDetected) {
      const existingVehicle = await prisma.vehicle.findFirst({
        where: { userId, plate: result.plateDetected },
      });
      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else {
        const newVehicle = await prisma.vehicle.create({
          data: { userId, plate: result.plateDetected },
        });
        vehicleId = newVehicle.id;
      }
    }

    // Update image record
    await prisma.image.update({
      where: { id: imageId },
      data: {
        processedPath,
        thumbnailPath,
        finalName,
        plateDetected: result.plateDetected,
        sequenceNumber,
        vehicleId,
        status: "completed",
        width: result.metadata.width,
        height: result.metadata.height,
        format: result.metadata.format,
      },
    });

    // Update processing job
    await prisma.processingJob.update({
      where: { imageId },
      data: {
        status: "completed",
        progress: 100,
        step: "Concluído",
        completedAt: new Date(),
      },
    });

    // Update batch stats
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      select: { batchId: true },
    });

    if (image?.batchId) {
      await updateBatchStats(image.batchId);
    }

    console.log(`[Worker] Job ${job.id} completed successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Worker] Job ${job.id} failed:`, errorMessage);

    await prisma.image.update({
      where: { id: imageId },
      data: { status: "error", errorMessage },
    });

    await prisma.processingJob.update({
      where: { imageId },
      data: {
        status: "failed",
        step: "Erro no processamento",
        logs: errorMessage,
        completedAt: new Date(),
      },
    });

    // Update batch stats
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      select: { batchId: true },
    });

    if (image?.batchId) {
      await updateBatchStats(image.batchId);
    }

    throw error;
  }
}

async function updateBatchStats(batchId: string): Promise<void> {
  const stats = await prisma.image.groupBy({
    by: ["status"],
    where: { batchId },
    _count: true,
  });

  const processedImages = stats.find((s) => s.status === "completed")?._count || 0;
  const errorImages = stats.find((s) => s.status === "error")?._count || 0;
  const totalImages = stats.reduce((sum, s) => sum + s._count, 0);
  const pendingImages = stats
    .filter((s) => ["pending", "queued", "processing"].includes(s.status))
    .reduce((sum, s) => sum + s._count, 0);

  let status: string;
  if (pendingImages > 0) {
    status = "processing";
  } else if (errorImages > 0 && processedImages > 0) {
    status = "partial";
  } else if (errorImages === totalImages) {
    status = "error";
  } else {
    status = "completed";
  }

  await prisma.batch.update({
    where: { id: batchId },
    data: { processedImages, errorImages, totalImages, status },
  });
}

// Create worker
const worker = new Worker<ImageProcessingJobData>(QUEUE_NAME, processImageJob, {
  connection,
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || "3"),
  limiter: {
    max: 10,
    duration: 1000,
  },
});

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on("progress", (job, progress) => {
  console.log(`[Worker] Job ${job.id} progress: ${progress}%`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Worker] Shutting down...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Worker] Shutting down...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log(`[Worker] Image processor started, listening on queue: ${QUEUE_NAME}`);
