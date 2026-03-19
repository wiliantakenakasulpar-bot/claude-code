import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFileStream } from "@/lib/storage";
import path from "path";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Params) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { path: pathParts } = await params;
  const filePath = pathParts.join("/");

  // Security: ensure user can only access their own files
  if (!filePath.startsWith(authUser.userId)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const { buffer, mimeType } = await getFileStream(filePath);
    const filename = path.basename(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
  }
}
