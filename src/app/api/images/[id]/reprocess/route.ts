import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addImageProcessingJob } from "@/lib/queue";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const image = await prisma.image.findFirst({
    where: { id, userId: authUser.userId },
  });

  if (!image) {
    return NextResponse.json({ success: false, error: "Image not found" }, { status: 404 });
  }

  // Get user settings
  const settings = await prisma.userSettings.findUnique({
    where: { userId: authUser.userId },
  });

  await prisma.image.update({
    where: { id },
    data: { status: "queued", errorMessage: null },
  });

  await prisma.processingJob.upsert({
    where: { imageId: id },
    create: { imageId: id, status: "queued", progress: 0 },
    update: { status: "queued", progress: 0, step: null, logs: null, completedAt: null },
  });

  const jobId = await addImageProcessingJob({
    imageId: id,
    userId: authUser.userId,
    originalPath: image.originalPath,
    backgroundType: settings?.backgroundType || "studio",
    quality: settings?.quality || "high",
    format: settings?.format || "jpg",
    autoOcr: settings?.autoOcr ?? true,
  });

  await prisma.processingJob.update({
    where: { imageId: id },
    data: { jobId },
  });

  return NextResponse.json({ success: true, message: "Reprocessing started", data: { jobId } });
}
