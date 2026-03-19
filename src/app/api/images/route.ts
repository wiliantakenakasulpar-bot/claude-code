import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { addImageProcessingJob } from "@/lib/queue";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

export const config = {
  api: { bodyParser: false },
};

// GET /api/images - list images
export async function GET(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const status = url.searchParams.get("status") || undefined;
  const batchId = url.searchParams.get("batchId") || undefined;
  const vehicleId = url.searchParams.get("vehicleId") || undefined;
  const plateSearch = url.searchParams.get("plate") || undefined;

  const where = {
    userId: authUser.userId,
    ...(status && { status }),
    ...(batchId && { batchId }),
    ...(vehicleId && { vehicleId }),
    ...(plateSearch && {
      plateDetected: { contains: plateSearch.toUpperCase() },
    }),
  };

  const [images, total] = await Promise.all([
    prisma.image.findMany({
      where,
      include: {
        vehicle: true,
        processingJob: true,
        batch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.image.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: images,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// POST /api/images - upload images
export async function POST(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const batchName = (formData.get("batchName") as string) || `Lote ${new Date().toLocaleDateString("pt-BR")}`;

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No files provided" }, { status: 400 });
    }

    // Get user settings
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: authUser.userId },
    });

    const settings = userSettings || {
      backgroundType: "studio",
      quality: "high",
      format: "jpg",
      autoOcr: true,
      autoProcess: true,
    };

    // Create batch
    const batch = await prisma.batch.create({
      data: {
        userId: authUser.userId,
        name: batchName,
        status: "processing",
        totalImages: files.length,
      },
    });

    const results = [];

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);

        // Handle HEIC format
        if (
          file.type === "image/heic" ||
          file.name.toLowerCase().endsWith(".heic")
        ) {
          try {
            const heicConvert = (await import("heic-convert")).default;
            buffer = await heicConvert({
              buffer,
              format: "JPEG",
              quality: 0.95,
            });
          } catch {
            // If heic-convert fails, try with sharp
            buffer = await sharp(buffer).jpeg().toBuffer();
          }
        }

        // Upload original
        const stored = await uploadFile(buffer, file.name, authUser.userId, "originals");

        // Create image record
        const image = await prisma.image.create({
          data: {
            id: uuidv4(),
            userId: authUser.userId,
            batchId: batch.id,
            originalName: file.name,
            originalPath: stored.path,
            status: "queued",
            fileSize: buffer.length,
          },
        });

        // Create processing job record
        await prisma.processingJob.create({
          data: {
            imageId: image.id,
            status: "queued",
            progress: 0,
          },
        });

        // Add to processing queue if auto-process enabled
        if (settings.autoProcess) {
          const jobId = await addImageProcessingJob({
            imageId: image.id,
            userId: authUser.userId,
            originalPath: stored.path,
            backgroundType: settings.backgroundType,
            quality: settings.quality,
            format: settings.format,
            autoOcr: settings.autoOcr,
          });

          await prisma.processingJob.update({
            where: { imageId: image.id },
            data: { jobId },
          });
        }

        results.push({ id: image.id, name: file.name, status: "queued" });
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        results.push({
          name: file.name,
          status: "error",
          error: fileError instanceof Error ? fileError.message : "Upload failed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { batch, images: results },
      message: `${results.length} images uploaded successfully`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}
