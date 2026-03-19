import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFile } from "@/lib/storage";
import archiver from "archiver";
import { Readable } from "stream";

// Download single image
export async function GET(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const imageId = url.searchParams.get("imageId");
  const type = url.searchParams.get("type") || "processed"; // original | processed

  if (!imageId) {
    return NextResponse.json({ success: false, error: "imageId required" }, { status: 400 });
  }

  const image = await prisma.image.findFirst({
    where: { id: imageId, userId: authUser.userId },
  });

  if (!image) {
    return NextResponse.json({ success: false, error: "Image not found" }, { status: 404 });
  }

  const filePath = type === "original" ? image.originalPath : image.processedPath;
  if (!filePath) {
    return NextResponse.json({ success: false, error: "File not available" }, { status: 404 });
  }

  try {
    const buffer = await getFile(filePath);
    const filename = image.finalName || image.originalName;
    const ext = filePath.split(".").pop() || "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
  }
}

// POST /api/download - batch download as ZIP
export async function POST(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { imageIds, batchId, vehicleId, type = "processed" } = body;

    let where: Record<string, unknown> = { userId: authUser.userId };

    if (imageIds?.length) {
      where = { ...where, id: { in: imageIds } };
    } else if (batchId) {
      where = { ...where, batchId };
    } else if (vehicleId) {
      where = { ...where, vehicleId };
    }

    if (type === "processed") {
      where = { ...where, status: "completed" };
    }

    const images = await prisma.image.findMany({
      where,
      include: { vehicle: true },
      orderBy: [
        { plateDetected: "asc" },
        { sequenceNumber: "asc" },
        { createdAt: "asc" },
      ],
    });

    if (images.length === 0) {
      return NextResponse.json({ success: false, error: "No images found" }, { status: 404 });
    }

    // Create ZIP archive
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    const archiveFinished = new Promise<void>((resolve, reject) => {
      archive.on("finish", resolve);
      archive.on("error", reject);
    });

    // Add files to archive
    for (const image of images) {
      const filePath = type === "original" ? image.originalPath : image.processedPath;
      if (!filePath) continue;

      try {
        const buffer = await getFile(filePath);
        const filename = image.finalName || image.originalName;

        // Organize by plate/vehicle
        const folder = image.plateDetected || "sem-placa";
        archive.append(buffer, { name: `${folder}/${filename}` });
      } catch {
        console.warn(`File not found for image ${image.id}`);
      }
    }

    archive.finalize();
    await archiveFinished;

    const zipBuffer = Buffer.concat(chunks);
    const zipName = batchId
      ? `lote_${batchId.slice(-8)}.zip`
      : vehicleId
      ? `veiculo_${images[0]?.plateDetected || vehicleId.slice(-8)}.zip`
      : `imagens_${Date.now()}.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ success: false, error: "Download failed" }, { status: 500 });
  }
}
