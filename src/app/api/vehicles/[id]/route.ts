import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, userId: authUser.userId },
    include: {
      images: {
        include: { processingJob: true },
        orderBy: [{ sequenceNumber: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!vehicle) {
    return NextResponse.json({ success: false, error: "Vehicle not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: vehicle });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, userId: authUser.userId },
  });

  if (!vehicle) {
    return NextResponse.json({ success: false, error: "Vehicle not found" }, { status: 404 });
  }

  const updated = await prisma.vehicle.update({
    where: { id },
    data: {
      plate: body.plate?.toUpperCase(),
      model: body.model,
      color: body.color,
      year: body.year ? parseInt(body.year) : undefined,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
