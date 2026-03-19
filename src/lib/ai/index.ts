export * from "./background-removal";
export * from "./image-enhancement";
export * from "./ocr";

import sharp from "sharp";
import { replaceBackground, BackgroundType } from "./background-removal";
import {
  enhanceWithSharp,
  enhanceWithOpenAI,
  generateThumbnail,
  getImageMetadata,
  resizeToStandard,
} from "./image-enhancement";
import { detectLicensePlate } from "./ocr";

export interface ProcessingOptions {
  backgroundType: BackgroundType;
  quality: "high" | "ultra";
  format: "jpg" | "png";
  autoOcr: boolean;
  useOpenAI?: boolean;
}

export interface ProcessingResult {
  processedBuffer: Buffer;
  thumbnailBuffer: Buffer;
  plateDetected: string | null;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

/**
 * Main processing pipeline for automotive images
 */
export async function processAutomotiveImage(
  imageBuffer: Buffer,
  options: ProcessingOptions,
  onProgress?: (step: string, progress: number) => Promise<void>
): Promise<ProcessingResult> {
  const {
    backgroundType,
    quality,
    format,
    autoOcr,
    useOpenAI = false,
  } = options;

  await onProgress?.("Preparando imagem...", 5);

  // Step 1: Normalize input (handle HEIC, rotate based on EXIF, etc.)
  let workingBuffer = await sharp(imageBuffer)
    .rotate() // Auto-orient based on EXIF
    .toBuffer();

  await onProgress?.("Detectando placa...", 15);

  // Step 2: OCR plate detection (on original, before background removal)
  let plateDetected: string | null = null;
  if (autoOcr) {
    try {
      const ocrResult = await detectLicensePlate(workingBuffer);
      plateDetected = ocrResult.plate;
    } catch (err) {
      console.warn("OCR failed:", err);
    }
  }

  await onProgress?.("Removendo fundo...", 30);

  let processedBuffer: Buffer;

  if (useOpenAI && process.env.OPENAI_API_KEY) {
    // Use OpenAI for full AI-powered processing
    await onProgress?.("Processando com IA...", 50);
    try {
      processedBuffer = await enhanceWithOpenAI(workingBuffer, backgroundType);
      await onProgress?.("Refinando com IA...", 70);
    } catch (err) {
      console.warn("OpenAI processing failed, falling back to Sharp:", err);
      processedBuffer = await replaceBackground(workingBuffer, backgroundType);
      await onProgress?.("Melhorando qualidade...", 70);
    }
  } else {
    // Use Sharp-based processing (no AI API needed)
    processedBuffer = await replaceBackground(workingBuffer, backgroundType);
    await onProgress?.("Melhorando qualidade...", 60);
  }

  await onProgress?.("Ajustando resolução...", 75);

  // Step 3: Enhance quality
  processedBuffer = await enhanceWithSharp(processedBuffer, quality);

  await onProgress?.("Redimensionando...", 85);

  // Step 4: Resize to standard
  processedBuffer = await resizeToStandard(processedBuffer, quality);

  await onProgress?.("Gerando thumbnail...", 90);

  // Step 5: Convert to final format
  if (format === "png") {
    processedBuffer = await sharp(processedBuffer).png({ quality: 95 }).toBuffer();
  } else {
    processedBuffer = await sharp(processedBuffer)
      .jpeg({ quality: quality === "ultra" ? 98 : 92, mozjpeg: true })
      .toBuffer();
  }

  // Step 6: Generate thumbnail
  const thumbnailBuffer = await generateThumbnail(processedBuffer);

  // Step 7: Get metadata
  const metadata = await getImageMetadata(processedBuffer);

  await onProgress?.("Concluído", 100);

  return {
    processedBuffer,
    thumbnailBuffer,
    plateDetected,
    metadata,
  };
}
