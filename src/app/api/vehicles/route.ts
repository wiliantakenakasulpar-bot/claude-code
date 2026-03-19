import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || undefined;
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");

  const where = {
    userId: authUser.userId,
    ...(search && {
      OR: [
        { plate: { contains: search.toUpperCase() } },
        { model: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { images: true } },
        images: {
          where: { status: "completed" },
          select: { thumbnailPath: true, finalName: true },
          orderBy: { sequenceNumber: "asc" },
          take: 1,
        },
      },
    }),
    prisma.vehicle.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: vehicles,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
