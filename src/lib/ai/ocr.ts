/**
 * OCR for Brazilian license plate detection
 * Supports: ABC-1234 (old format) and ABC1D23 (Mercosul format)
 */

export interface PlateDetectionResult {
  plate: string | null;
  confidence: number;
  format: "old" | "mercosul" | "unknown";
}

// Brazilian plate patterns
const PLATE_PATTERNS = [
  { regex: /\b[A-Z]{3}[-\s]?\d{4}\b/gi, format: "old" as const },           // ABC-1234
  { regex: /\b[A-Z]{3}\d[A-Z]\d{2}\b/gi, format: "mercosul" as const },     // ABC1D23
];

/**
 * Detect license plate using Plate Recognizer API
 */
async function detectWithPlateRecognizer(imageBuffer: Buffer): Promise<PlateDetectionResult> {
  const apiKey = process.env.PLATE_RECOGNIZER_API_KEY;
  if (!apiKey) throw new Error("Plate Recognizer API key not configured");

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" });
  formData.append("upload", blob, "plate.jpg");
  formData.append("regions", "br"); // Brazil

  const response = await fetch("https://api.platerecognizer.com/v1/plate-reader/", {
    method: "POST",
    headers: { Authorization: `Token ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Plate Recognizer error: ${response.status}`);
  }

  const data = await response.json() as {
    results?: Array<{
      plate: string;
      score: number;
      region?: { code: string };
    }>;
  };

  if (!data.results || data.results.length === 0) {
    return { plate: null, confidence: 0, format: "unknown" };
  }

  const best = data.results[0];
  const plate = normalizeplate(best.plate.toUpperCase());
  const format = detectformat(plate);

  return {
    plate,
    confidence: best.score,
    format,
  };
}

/**
 * Detect license plate using Google Cloud Vision API
 */
async function detectWithGoogleVision(imageBuffer: Buffer): Promise<PlateDetectionResult> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) throw new Error("Google Cloud Vision API key not configured");

  const base64Image = imageBuffer.toString("base64");

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [
              { type: "TEXT_DETECTION" },
              { type: "OBJECT_LOCALIZATION" },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Vision error: ${response.status}`);
  }

  const data = await response.json() as {
    responses?: Array<{
      textAnnotations?: Array<{ description: string }>;
    }>;
  };

  const texts = data.responses?.[0]?.textAnnotations || [];
  const fullText = texts.map((t) => t.description).join(" ").toUpperCase();

  return extractPlateFromText(fullText);
}

/**
 * Extract plate from raw text using regex patterns
 */
export function extractPlateFromText(text: string): PlateDetectionResult {
  const normalizedText = text.toUpperCase().replace(/\s+/g, " ");

  for (const { regex, format } of PLATE_PATTERNS) {
    const matches = normalizedText.match(regex);
    if (matches && matches.length > 0) {
      const plate = normalizeplate(matches[0]);
      return { plate, confidence: 0.85, format };
    }
  }

  return { plate: null, confidence: 0, format: "unknown" };
}

/**
 * Normalize plate format (remove dashes/spaces)
 */
function normalizeplate(plate: string): string {
  return plate.replace(/[-\s]/g, "").toUpperCase();
}

/**
 * Detect plate format
 */
function detectformat(plate: string): "old" | "mercosul" | "unknown" {
  if (/^[A-Z]{3}\d{4}$/.test(plate)) return "old";
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate)) return "mercosul";
  return "unknown";
}

/**
 * Main plate detection function - tries multiple providers
 */
export async function detectLicensePlate(imageBuffer: Buffer): Promise<PlateDetectionResult> {
  // Try Plate Recognizer first (specialized)
  if (process.env.PLATE_RECOGNIZER_API_KEY) {
    try {
      const result = await detectWithPlateRecognizer(imageBuffer);
      if (result.plate && result.confidence > 0.6) {
        return result;
      }
    } catch (err) {
      console.warn("Plate Recognizer failed:", err);
    }
  }

  // Try Google Vision
  if (process.env.GOOGLE_CLOUD_API_KEY) {
    try {
      const result = await detectWithGoogleVision(imageBuffer);
      if (result.plate) {
        return result;
      }
    } catch (err) {
      console.warn("Google Vision failed:", err);
    }
  }

  // No API available or no plate found
  return { plate: null, confidence: 0, format: "unknown" };
}

/**
 * Validate a Brazilian license plate
 */
export function validateBrazilianPlate(plate: string): boolean {
  const normalized = normalizeplate(plate);
  return (
    /^[A-Z]{3}\d{4}$/.test(normalized) ||      // Old format
    /^[A-Z]{3}\d[A-Z]\d{2}$/.test(normalized)  // Mercosul
  );
}
