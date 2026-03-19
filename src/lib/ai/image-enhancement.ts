import sharp from "sharp";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import os from "os";

export interface EnhancementOptions {
  quality: "high" | "ultra";
  useAI: boolean;
  backgroundType: "white" | "studio" | "outdoor";
}

/**
 * Enhance image quality using Sharp (always available)
 */
export async function enhanceWithSharp(
  imageBuffer: Buffer,
  quality: "high" | "ultra"
): Promise<Buffer> {
  const isUltra = quality === "ultra";

  return sharp(imageBuffer)
    // Ensure proper color space
    .toColorspace("srgb")
    // Auto-orient based on EXIF
    .rotate()
    // Sharpen for catalog quality
    .sharpen({
      sigma: isUltra ? 1.5 : 1.0,
      m1: 1.5,
      m2: 0.7,
    })
    // Slight contrast and brightness boost for professional look
    .modulate({
      brightness: 1.05,
      saturation: 1.1,
    })
    // Normalize levels
    .normalize()
    // Gamma correction for screen display
    .gamma(1.0)
    // Output
    .jpeg({
      quality: isUltra ? 98 : 92,
      chromaSubsampling: "4:4:4",
      mozjpeg: true,
    })
    .toBuffer();
}

/**
 * Enhance using OpenAI DALL-E image editing
 * Used when OPENAI_API_KEY is available
 */
export async function enhanceWithOpenAI(
  imageBuffer: Buffer,
  backgroundType: string
): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const client = new OpenAI({ apiKey });

  const prompt = `Transform this vehicle photo into a professional automotive catalog image.
  Remove any background and replace with a ${backgroundType === "white" ? "clean white studio" : backgroundType === "studio" ? "professional automotive studio with subtle gradient floor" : "sophisticated outdoor setting with neutral sky"} background.
  Keep the car exactly as shown - same color, wheels, trim and proportions.
  Correct to a 3/4 front angle if needed, center the vehicle.
  Apply premium lighting with natural reflections and soft shadow.
  Remove imperfections from environment (dirt, reflections of surroundings, people, objects).
  Increase sharpness and overall quality to marketplace standard.
  No text, logos or extra elements. Realistic professional catalog photo.`;

  // Save buffer to temp file (OpenAI requires file)
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `enhance_${Date.now()}.png`);
  await fs.writeFile(tmpFile, imageBuffer);

  try {
    const response = await client.images.edit({
      model: "dall-e-2",
      image: (await fs.readFile(tmpFile)) as unknown as File,
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image data returned from OpenAI");

    return Buffer.from(b64, "base64");
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}

/**
 * Center and crop the vehicle optimally
 */
export async function centerAndCrop(imageBuffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const { width = 1920, height = 1080 } = metadata;

  // Determine target aspect ratio (16:9 for automotive standard)
  const targetAspect = 16 / 9;
  const currentAspect = width / height;

  let resizeWidth = width;
  let resizeHeight = height;

  if (currentAspect > targetAspect) {
    // Too wide, crop sides
    resizeHeight = height;
    resizeWidth = Math.round(height * targetAspect);
  } else if (currentAspect < targetAspect) {
    // Too tall, crop top/bottom
    resizeWidth = width;
    resizeHeight = Math.round(width / targetAspect);
  }

  return sharp(imageBuffer)
    .resize(resizeWidth, resizeHeight, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Resize to standard output resolution
 */
export async function resizeToStandard(
  imageBuffer: Buffer,
  quality: "high" | "ultra"
): Promise<Buffer> {
  const targetWidth = quality === "ultra" ? 3840 : 1920;
  const targetHeight = quality === "ultra" ? 2160 : 1080;

  const metadata = await sharp(imageBuffer).metadata();
  const { width = 0, height = 0 } = metadata;

  // Only upscale if ultra quality, otherwise just ensure max size
  if (width >= targetWidth || height >= targetHeight) {
    return sharp(imageBuffer)
      .resize(targetWidth, targetHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: quality === "ultra" ? 98 : 92, mozjpeg: true })
      .toBuffer();
  }

  // Resize up to target
  return sharp(imageBuffer)
    .resize(targetWidth, targetHeight, {
      fit: "inside",
      withoutEnlargement: false,
      kernel: "lanczos3",
    })
    .jpeg({ quality: quality === "ultra" ? 98 : 92, mozjpeg: true })
    .toBuffer();
}

/**
 * Generate thumbnail
 */
export async function generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(400, 300, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Get image metadata
 */
export async function getImageMetadata(
  imageBuffer: Buffer
): Promise<{ width: number; height: number; format: string; size: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
    size: imageBuffer.length,
  };
}
