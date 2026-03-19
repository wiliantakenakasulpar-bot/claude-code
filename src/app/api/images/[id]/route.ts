import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteFile } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const image = await prisma.image.findFirst({
    where: { id, userId: authUser.userId },
    include: {
      vehicle: true,
      processingJob: true,
      batch: true,
    },
  });

  if (!image) {
    return NextResponse.json({ success: false, error: "Image not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: image });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const image = await prisma.image.findFirst({
    where: { id, userId: authUser.userId },
  });

  if (!image) {
    return NextResponse.json({ success: false, error: "Image not found" }, { status: 404 });
  }

  const allowedUpdates: Record<string, unknown> = {};

  // Allow updating plate manually
  if (body.plateDetected !== undefined) {
    allowedUpdates.plateDetected = body.plateDetected?.toUpperCase() || null;

    // Find or create vehicle
    if (body.plateDetected) {
      const plate = body.plateDetected.toUpperCase();
      let vehicle = await prisma.vehicle.findFirst({
        where: { userId: authUser.userId, plate },
      });
      if (!vehicle) {
        vehicle = await prisma.vehicle.create({
          data: { userId: authUser.userId, plate },
        });
      }
      allowedUpdates.vehicleId = vehicle.id;
    }
  }

  const updated = await prisma.image.update({
    where: { id },
    data: allowedUpdates,
    include: { vehicle: true, processingJob: true },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
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

  // Delete files from storage
  if (image.originalPath) await deleteFile(image.originalPath);
  if (image.processedPath) await deleteFile(image.processedPath);
  if (image.thumbnailPath) await deleteFile(image.thumbnailPath);

  await prisma.image.delete({ where: { id } });

  return NextResponse.json({ success: true, message: "Image deleted" });
}
