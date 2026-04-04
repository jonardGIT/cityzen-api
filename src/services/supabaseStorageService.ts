import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
];
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export interface UploadIncidentMediaInput {
  actorUserId: string;
  fileName: string;
  contentType: string;
  dataBase64: string;
  incidentId?: string;
}

export interface UploadIncidentMediaResult {
  bucket: string;
  objectPath: string;
  mediaUrl: string;
  contentType: string;
  fileName: string;
  size: number;
}

export interface UploadIncidentMediaBatchResult {
  mediaUrls: string[];
  files: UploadIncidentMediaResult[];
}

export interface ArchiveIncidentMediaResult {
  mediaUrl: string;
  archived: boolean;
  skipped: boolean;
  archivedObjectPath?: string;
  reason?: string;
}

export class SupabaseStorageServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'SupabaseStorageServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function isSupabaseStorageEnabled(): boolean {
  return isTrue(process.env.SUPABASE_STORAGE_ENABLED);
}

function isSupabaseStorageArchiveEnabled(): boolean {
  const rawValue = process.env.SUPABASE_STORAGE_ARCHIVE_ENABLED?.trim();
  if (!rawValue) {
    return true;
  }

  return isTrue(rawValue);
}

function getSupabaseUrl(): string {
  const value = process.env.SUPABASE_URL?.trim();
  if (!value) {
    throw new SupabaseStorageServiceError(
      'SUPABASE_STORAGE_CONFIG_ERROR',
      'SUPABASE_URL must be configured when SUPABASE_STORAGE_ENABLED=true',
      503,
    );
  }

  return value;
}

function getSupabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value) {
    throw new SupabaseStorageServiceError(
      'SUPABASE_STORAGE_CONFIG_ERROR',
      'SUPABASE_SERVICE_ROLE_KEY must be configured when SUPABASE_STORAGE_ENABLED=true',
      503,
    );
  }

  return value;
}

function getBucketName(): string {
  const value = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if (!value) {
    throw new SupabaseStorageServiceError(
      'SUPABASE_STORAGE_CONFIG_ERROR',
      'SUPABASE_STORAGE_BUCKET must be configured when SUPABASE_STORAGE_ENABLED=true',
      503,
    );
  }

  return value;
}

function getArchivePrefix(): string {
  const value = process.env.SUPABASE_STORAGE_ARCHIVE_PREFIX?.trim();
  return value && value.length > 0 ? value.replace(/^\/+|\/+$/g, '') : 'archive/incidents';
}

function getMaxUploadSizeBytes(): number {
  const rawValue = process.env.SUPABASE_STORAGE_MAX_UPLOAD_BYTES?.trim();
  if (!rawValue) {
    return DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new SupabaseStorageServiceError(
      'SUPABASE_STORAGE_CONFIG_ERROR',
      'SUPABASE_STORAGE_MAX_UPLOAD_BYTES must be a positive number when provided',
      503,
    );
  }

  return Math.floor(parsedValue);
}

function getAllowedMimeTypes(): string[] {
  const rawValue = process.env.SUPABASE_STORAGE_ALLOWED_MIME_TYPES?.trim();
  if (!rawValue) {
    return DEFAULT_ALLOWED_MIME_TYPES;
  }

  return rawValue
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

function createStorageClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim().toLowerCase();
  const normalized = trimmed.replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-');
  const cleaned = normalized.replace(/^-|-$/g, '');
  return cleaned || 'upload';
}

function stripDataUrlPrefix(dataBase64: string): string {
  const trimmed = dataBase64.trim();
  const match = trimmed.match(/^data:[^;]+;base64,(.+)$/i);
  return match ? match[1] : trimmed;
}

function decodeBase64(dataBase64: string): Buffer {
  const normalized = stripDataUrlPrefix(dataBase64).replace(/\s+/g, '');
  if (!normalized || !BASE64_PATTERN.test(normalized)) {
    throw new SupabaseStorageServiceError(
      'INVALID_MEDIA_PAYLOAD',
      'dataBase64 must be a valid base64-encoded string',
      400,
    );
  }

  return Buffer.from(normalized, 'base64');
}

function buildObjectPath(actorUserId: string, fileName: string, incidentId?: string): string {
  const safeFileName = sanitizeFileName(fileName);
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const scope = incidentId?.trim() || actorUserId;
  return `incidents/${year}/${month}/${scope}/${Date.now()}-${randomUUID()}-${safeFileName}`;
}

function tryExtractManagedObjectPath(
  mediaUrl: string,
): { bucket: string; objectPath: string } | null {
  const bucket = getBucketName();

  try {
    const url = new URL(mediaUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const objectPath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    if (!objectPath) {
      return null;
    }

    return { bucket, objectPath };
  } catch {
    return null;
  }
}

function buildArchivedObjectPath(objectPath: string): string {
  const normalizedPath = objectPath.replace(/^\/+/, '');
  return `${getArchivePrefix()}/${Date.now()}-${randomUUID()}-${normalizedPath.replace(/\//g, '--')}`;
}

export async function archiveIncidentMediaUrls(
  mediaUrls: string[],
): Promise<ArchiveIncidentMediaResult[]> {
  if (!isSupabaseStorageEnabled() || !isSupabaseStorageArchiveEnabled()) {
    return mediaUrls.map((mediaUrl) => ({
      mediaUrl,
      archived: false,
      skipped: true,
      reason: 'storage archiving is disabled',
    }));
  }

  const client = createStorageClient();
  const bucket = getBucketName();

  return Promise.all(
    mediaUrls.map(async (mediaUrl) => {
      const parsed = tryExtractManagedObjectPath(mediaUrl);
      if (!parsed || parsed.bucket !== bucket) {
        return {
          mediaUrl,
          archived: false,
          skipped: true,
          reason: 'mediaUrl is not managed by the configured Supabase bucket',
        };
      }

      const archivedObjectPath = buildArchivedObjectPath(parsed.objectPath);

      try {
        const copyResult = await client.storage
          .from(bucket)
          .copy(parsed.objectPath, archivedObjectPath);
        if (copyResult.error) {
          return {
            mediaUrl,
            archived: false,
            skipped: true,
            reason: copyResult.error.message || 'failed to copy object into archive path',
          };
        }

        const removeResult = await client.storage.from(bucket).remove([parsed.objectPath]);
        if (removeResult.error) {
          return {
            mediaUrl,
            archived: false,
            skipped: true,
            reason:
              removeResult.error.message || 'failed to remove original object after archive copy',
          };
        }

        return {
          mediaUrl,
          archived: true,
          skipped: false,
          archivedObjectPath,
        };
      } catch (error) {
        return {
          mediaUrl,
          archived: false,
          skipped: true,
          reason: error instanceof Error ? error.message : 'unknown archive failure',
        };
      }
    }),
  );
}

export async function uploadIncidentMedia(
  input: UploadIncidentMediaInput,
): Promise<UploadIncidentMediaResult> {
  if (!isSupabaseStorageEnabled()) {
    throw new SupabaseStorageServiceError(
      'SUPABASE_STORAGE_DISABLED',
      'Supabase Storage is disabled for this environment',
      503,
    );
  }

  const normalizedContentType = input.contentType.trim().toLowerCase();
  if (!getAllowedMimeTypes().includes(normalizedContentType)) {
    throw new SupabaseStorageServiceError(
      'UNSUPPORTED_MEDIA_TYPE',
      'contentType is not allowed for incident media uploads',
      400,
    );
  }

  const fileBuffer = decodeBase64(input.dataBase64);
  if (fileBuffer.length === 0) {
    throw new SupabaseStorageServiceError(
      'EMPTY_MEDIA_PAYLOAD',
      'dataBase64 must decode to a non-empty file',
      400,
    );
  }

  const maxUploadSizeBytes = getMaxUploadSizeBytes();
  if (fileBuffer.length > maxUploadSizeBytes) {
    throw new SupabaseStorageServiceError(
      'MEDIA_TOO_LARGE',
      `Uploaded media exceeds the configured ${maxUploadSizeBytes} byte limit`,
      413,
    );
  }

  const bucket = getBucketName();
  const objectPath = buildObjectPath(input.actorUserId, input.fileName, input.incidentId);
  const client = createStorageClient();
  const uploadResult = await client.storage.from(bucket).upload(objectPath, fileBuffer, {
    contentType: normalizedContentType,
    upsert: false,
  });

  if (uploadResult.error) {
    throw new SupabaseStorageServiceError(
      'SUPABASE_STORAGE_UPLOAD_FAILED',
      uploadResult.error.message || 'Supabase Storage upload failed',
      502,
    );
  }

  const publicUrlResult = client.storage.from(bucket).getPublicUrl(objectPath);
  const mediaUrl = publicUrlResult.data.publicUrl?.trim();
  if (!mediaUrl) {
    throw new SupabaseStorageServiceError(
      'SUPABASE_STORAGE_URL_FAILED',
      'Supabase Storage did not return a public URL for the uploaded media',
      502,
    );
  }

  return {
    bucket,
    objectPath,
    mediaUrl,
    contentType: normalizedContentType,
    fileName: sanitizeFileName(input.fileName),
    size: fileBuffer.length,
  };
}
