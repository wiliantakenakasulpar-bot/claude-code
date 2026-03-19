export type UserRole = "admin" | "user";
export type BackgroundType = "white" | "studio" | "outdoor";
export type ImageQuality = "high" | "ultra";
export type ImageFormat = "jpg" | "png";
export type ImageStatus = "pending" | "queued" | "processing" | "completed" | "error";
export type BatchStatus = "processing" | "completed" | "partial" | "error";
export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  storeId?: string | null;
  createdAt: string;
  updatedAt: string;
  settings?: UserSettings | null;
}

export interface UserSettings {
  id: string;
  userId: string;
  backgroundType: BackgroundType;
  quality: ImageQuality;
  format: ImageFormat;
  autoOcr: boolean;
  autoProcess: boolean;
}

export interface Batch {
  id: string;
  userId: string;
  name: string;
  status: BatchStatus;
  totalImages: number;
  processedImages: number;
  errorImages: number;
  createdAt: string;
  updatedAt: string;
  images?: Image[];
}

export interface Vehicle {
  id: string;
  userId: string;
  plate?: string | null;
  model?: string | null;
  color?: string | null;
  year?: number | null;
  createdAt: string;
  updatedAt: string;
  images?: Image[];
}

export interface Image {
  id: string;
  userId: string;
  batchId?: string | null;
  vehicleId?: string | null;
  originalName: string;
  originalPath: string;
  processedPath?: string | null;
  thumbnailPath?: string | null;
  finalName?: string | null;
  plateDetected?: string | null;
  sequenceNumber?: number | null;
  status: ImageStatus;
  errorMessage?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle | null;
  batch?: Batch | null;
  processingJob?: ProcessingJob | null;
}

export interface ProcessingJob {
  id: string;
  imageId: string;
  jobId?: string | null;
  status: JobStatus;
  progress: number;
  step?: string | null;
  logs?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalImages: number;
  processedImages: number;
  pendingImages: number;
  errorImages: number;
  totalVehicles: number;
  totalBatches: number;
  recentBatches: Batch[];
}

export interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "uploaded" | "error";
  progress: number;
  error?: string;
  imageId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}
