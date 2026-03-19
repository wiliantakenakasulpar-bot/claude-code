import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const [imageStats, vehicleCount, batchCount, recentBatches] = await Promise.all([
    prisma.image.groupBy({
      by: ["status"],
      where: { userId: authUser.userId },
      _count: true,
    }),
    prisma.vehicle.count({ where: { userId: authUser.userId } }),
    prisma.batch.count({ where: { userId: authUser.userId } }),
    prisma.batch.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: { select: { images: true } },
      },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const stat of imageStats) {
    statusMap[stat.status] = stat._count;
  }

  const totalImages = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const processedImages = statusMap["completed"] || 0;
  const pendingImages =
    (statusMap["pending"] || 0) +
    (statusMap["queued"] || 0) +
    (statusMap["processing"] || 0);
  const errorImages = statusMap["error"] || 0;

  return NextResponse.json({
    success: true,
    data: {
      totalImages,
      processedImages,
      pendingImages,
      errorImages,
      totalVehicles: vehicleCount,
      totalBatches: batchCount,
      recentBatches,
    },
  });
}
