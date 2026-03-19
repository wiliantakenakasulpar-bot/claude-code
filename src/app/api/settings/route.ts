import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const settingsSchema = z.object({
  backgroundType: z.enum(["white", "studio", "outdoor"]).optional(),
  quality: z.enum(["high", "ultra"]).optional(),
  format: z.enum(["jpg", "png"]).optional(),
  autoOcr: z.boolean().optional(),
  autoProcess: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: authUser.userId },
  });

  return NextResponse.json({ success: true, data: settings });
}

export async function PUT(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validation = settingsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error.errors[0].message },
      { status: 400 }
    );
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: authUser.userId },
    create: {
      userId: authUser.userId,
      ...validation.data,
    },
    update: validation.data,
  });

  return NextResponse.json({ success: true, data: settings });
}
