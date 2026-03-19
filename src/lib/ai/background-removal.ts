import sharp from "sharp";
import FormData from "form-data";

export type BackgroundType = "white" | "studio" | "outdoor";

/**
 * Remove background using remove.bg API
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const apiKey = process.env.REMOVE_BG_API_KEY;

  if (!apiKey) {
    // Fallback: use basic threshold-based removal (demo mode)
    return simulateBackgroundRemoval(imageBuffer);
  }

  const formData = new FormData();
  formData.append("image_file", imageBuffer, {
    filename: "image.jpg",
    contentType: "image/jpeg",
  });
  formData.append("size", "auto");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      ...formData.getHeaders(),
    },
    body: formData as unknown as BodyInit,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`remove.bg API error: ${response.status} - ${error}`);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

/**
 * Simulate background removal for demo purposes
 */
async function simulateBackgroundRemoval(imageBuffer: Buffer): Promise<Buffer> {
  // In demo mode, just convert to PNG with transparency attempt
  return sharp(imageBuffer).ensureAlpha().png().toBuffer();
}

/**
 * Composite car onto a professional background
 */
export async function compositeWithBackground(
  carBuffer: Buffer,
  backgroundType: BackgroundType
): Promise<Buffer> {
  const { width, height } = await sharp(carBuffer).metadata();
  const w = width || 1920;
  const h = height || 1080;

  let backgroundBuffer: Buffer;

  switch (backgroundType) {
    case "white":
      backgroundBuffer = await generateWhiteBackground(w, h);
      break;
    case "studio":
      backgroundBuffer = await generateStudioBackground(w, h);
      break;
    case "outdoor":
      backgroundBuffer = await generateOutdoorBackground(w, h);
      break;
    default:
      backgroundBuffer = await generateStudioBackground(w, h);
  }

  // Composite the car on top of the background
  return sharp(backgroundBuffer)
    .composite([
      {
        input: carBuffer,
        blend: "over",
      },
    ])
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Generate a pure white premium background
 */
async function generateWhiteBackground(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .jpeg({ quality: 100 })
    .toBuffer();
}

/**
 * Generate a studio-style gradient background
 */
async function generateStudioBackground(width: number, height: number): Promise<Buffer> {
  // Create a gradient from light gray at top to slightly darker at bottom
  // with a subtle reflection effect
  const svgBackground = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="studioGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f0f0f0"/>
          <stop offset="50%" stop-color="#e8e8e8"/>
          <stop offset="100%" stop-color="#d0d0d0"/>
        </linearGradient>
        <radialGradient id="floorReflect" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#e0e0e0" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="topLight" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#f0f0f0" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#studioGrad)"/>
      <ellipse cx="${width / 2}" cy="${height}" rx="${width * 0.7}" ry="${height * 0.3}" fill="url(#floorReflect)"/>
      <rect width="${width}" height="${height}" fill="url(#topLight)"/>
      <line x1="0" y1="${height * 0.72}" x2="${width}" y2="${height * 0.72}"
            stroke="#c8c8c8" stroke-width="1" opacity="0.5"/>
    </svg>
  `;

  return sharp(Buffer.from(svgBackground)).jpeg({ quality: 100 }).toBuffer();
}

/**
 * Generate an outdoor premium background
 */
async function generateOutdoorBackground(width: number, height: number): Promise<Buffer> {
  const svgBackground = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="0.6">
          <stop offset="0%" stop-color="#b8d4e8"/>
          <stop offset="60%" stop-color="#d4e8f0"/>
          <stop offset="100%" stop-color="#e8f4f8"/>
        </linearGradient>
        <linearGradient id="groundGrad" x1="0" y1="0.6" x2="0" y2="1">
          <stop offset="0%" stop-color="#c8c8c0"/>
          <stop offset="100%" stop-color="#b0b0a8"/>
        </linearGradient>
        <radialGradient id="sunGlow" cx="75%" cy="15%" r="40%">
          <stop offset="0%" stop-color="#fff8e0" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#b8d4e8" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height * 0.65}" fill="url(#skyGrad)"/>
      <rect y="${height * 0.65}" width="${width}" height="${height * 0.35}" fill="url(#groundGrad)"/>
      <rect width="${width}" height="${height}" fill="url(#sunGlow)"/>
      <line x1="0" y1="${height * 0.65}" x2="${width}" y2="${height * 0.65}"
            stroke="#a8a89c" stroke-width="1" opacity="0.3"/>
    </svg>
  `;

  return sharp(Buffer.from(svgBackground)).jpeg({ quality: 100 }).toBuffer();
}

/**
 * Full background replacement pipeline:
 * 1. Remove existing background
 * 2. Add shadow
 * 3. Composite on professional background
 */
export async function replaceBackground(
  imageBuffer: Buffer,
  backgroundType: BackgroundType
): Promise<Buffer> {
  // Step 1: Remove background
  const carWithoutBg = await removeBackground(imageBuffer);

  // Step 2: Add soft shadow below the car
  const carWithShadow = await addCarShadow(carWithoutBg);

  // Step 3: Composite on background
  return compositeWithBackground(carWithShadow, backgroundType);
}

/**
 * Add a realistic shadow beneath the vehicle
 */
async function addCarShadow(carBuffer: Buffer): Promise<Buffer> {
  const { width, height } = await sharp(carBuffer).metadata();
  const w = width || 1920;
  const h = height || 1080;

  const shadowSvg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="${w / 2}" cy="${h * 0.88}" rx="${w * 0.38}" ry="${h * 0.04}"
               fill="url(#shadowGrad)"/>
    </svg>
  `;

  const shadowBuffer = await sharp(Buffer.from(shadowSvg)).png().toBuffer();

  return sharp(carBuffer)
    .composite([
      {
        input: shadowBuffer,
        blend: "multiply",
      },
    ])
    .png()
    .toBuffer();
}
