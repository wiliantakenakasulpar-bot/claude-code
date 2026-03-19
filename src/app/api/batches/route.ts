import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "10");

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { images: true } },
      },
    }),
    prisma.batch.count({ where: { userId: authUser.userId } }),
  ]);

  return NextResponse.json({
    success: true,
    data: batches,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
