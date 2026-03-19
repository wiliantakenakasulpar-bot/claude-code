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

  const batch = await prisma.batch.findFirst({
    where: { id, userId: authUser.userId },
    include: {
      images: {
        include: { processingJob: true, vehicle: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!batch) {
    return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: batch });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const batch = await prisma.batch.findFirst({
    where: { id, userId: authUser.userId },
  });

  if (!batch) {
    return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
  }

  await prisma.batch.delete({ where: { id } });

  return NextResponse.json({ success: true, message: "Batch deleted" });
}
