import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export interface StorageFile {
  path: string;
  url: string;
  size: number;
}

// Ensure directory exists
async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

// Local storage implementation
export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  userId: string,
  folder: "originals" | "processed" | "thumbnails" = "originals"
): Promise<StorageFile> {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const userDir = path.join(UPLOAD_DIR, userId, folder);
  await ensureDir(userDir);
  const filePath = path.join(userDir, filename);
  await fs.writeFile(filePath, buffer);
  const stats = await fs.stat(filePath);
  const relativePath = path.join(userId, folder, filename);
  return {
    path: relativePath,
    url: `${PUBLIC_URL}/api/files/${relativePath}`,
    size: stats.size,
  };
}

export async function getFile(filePath: string): Promise<Buffer> {
  const fullPath = path.join(UPLOAD_DIR, filePath);
  return fs.readFile(fullPath);
}

export async function deleteFile(filePath: string): Promise<void> {
  const fullPath = path.join(UPLOAD_DIR, filePath);
  await fs.unlink(fullPath).catch(() => {});
}

export async function getFileStream(filePath: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  const buffer = await getFile(filePath);
  return {
    buffer,
    mimeType: mimeTypes[ext] || "application/octet-stream",
  };
}

export function getPublicUrl(filePath: string): string {
  return `${PUBLIC_URL}/api/files/${filePath}`;
}

export async function initStorage(): Promise<void> {
  await ensureDir(UPLOAD_DIR);
  await ensureDir(path.join(UPLOAD_DIR, "tmp"));
}
