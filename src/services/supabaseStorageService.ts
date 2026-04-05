import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { isIncidentMediaUploadFeatureEnabled } from '../featureSelection.js';

const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_SIGNED_URL_TTL_SECONDS = 15 * 60;
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
  accessUrl: string;
  contentType: string;
  fileName: string;
  size: number;
}

export interface UploadIncidentMediaBatchResult {
  mediaUrls: string[];
  accessUrls: string[];
  files: UploadIncidentMediaResult[];
}

type StorageAccessMode = 'public' | 'signed';

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
  return isIncidentMediaUploadFeatureEnabled();
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

function getConfiguredBucketName(): string | null {
  const value = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  return value ? value : null;
}

function getStorageAccessMode(): StorageAccessMode {
  const value = process.env.SUPABASE_STORAGE_ACCESS_MODE?.trim().toLowerCase();
  if (!value) {
    return 'public';
  }

  if (value === 'public' || value === 'signed') {
    return value;
  }

  throw new SupabaseStorageServiceError(
    'SUPABASE_STORAGE_CONFIG_ERROR',
    'SUPABASE_STORAGE_ACCESS_MODE must be either public or signed when provided',
    503,
  );
}

function getSignedUrlTtlSeconds(): number {
  const rawValue = process.env.SUPABASE_STORAGE_SIGNED_URL_TTL_SECONDS?.trim();
  if (!rawValue) {
    return DEFAULT_SIGNED_URL_TTL_SECONDS;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new SupabaseStorageServiceError(
      'SUPABASE_STORAGE_CONFIG_ERROR',
      'SUPABASE_STORAGE_SIGNED_URL_TTL_SECONDS must be a positive number when provided',
      503,
    );
  }

  return Math.floor(parsedValue);
}

function getMediaScanWebhookUrl(): string | null {
  const value = process.env.SUPABASE_STORAGE_SCAN_WEBHOOK_URL?.trim();
  return value ? value : null;
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

async function removeUploadedObject(
  client: ReturnType<typeof createStorageClient>,
  bucket: string,
  objectPath: string,
): Promise<void> {
  try {
    await client.storage.from(bucket).remove([objectPath]);
  } catch {
    // Best-effort cleanup when a downstream scan submission fails.
  }
}

async function submitMediaScanRequest(
  input: UploadIncidentMediaInput,
  upload: UploadIncidentMediaResult,
): Promise<void> {
  const webhookUrl = getMediaScanWebhookUrl();
  if (!webhookUrl) {
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      type: 'incident-media-scan',
      actorUserId: input.actorUserId,
      incidentId: input.incidentId ?? null,
      bucket: upload.bucket,
      objectPath: upload.objectPath,
      mediaUrl: upload.mediaUrl,
      accessUrl: upload.accessUrl,
      contentType: upload.contentType,
      fileName: upload.fileName,
      size: upload.size,
    }),
  });

  if (!response.ok) {
    throw new Error(`Incident media scan webhook returned HTTP ${response.status}`);
  }
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

function buildManagedMediaReference(bucket: string, objectPath: string): string {
  return `supabase://${bucket}/${objectPath.replace(/^\/+/, '')}`;
}

function tryExtractManagedReference(
  mediaUrl: string,
): { bucket: string; objectPath: string } | null {
  const match = mediaUrl.match(/^supabase:\/\/([^/]+)\/(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    bucket: match[1],
    objectPath: match[2].replace(/^\/+/, ''),
  };
}

function tryExtractManagedObjectPath(
  mediaUrl: string,
): { bucket: string; objectPath: string } | null {
  const normalizedMediaUrl = mediaUrl.trim();
  const managedReference = tryExtractManagedReference(normalizedMediaUrl);
  if (managedReference) {
    return managedReference;
  }

  const bucket = getConfiguredBucketName();
  if (!bucket) {
    return null;
  }

  try {
    const url = new URL(normalizedMediaUrl);
    const markers = [`/storage/v1/object/public/${bucket}/`, `/storage/v1/object/sign/${bucket}/`];

    for (const marker of markers) {
      const markerIndex = url.pathname.indexOf(marker);

      if (markerIndex === -1) {
        continue;
      }

      const objectPath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
      if (!objectPath) {
        return null;
      }

      return { bucket, objectPath };
    }

    return null;
  } catch {
    return null;
  }
}

function buildPublicMediaUrl(bucket: string, objectPath: string): string {
  const baseUrl = getSupabaseUrl().replace(/\/+$/, '');
  const encodedPath = objectPath
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

async function getSignedMediaUrl(
  client: ReturnType<typeof createStorageClient>,
  objectPath: string,
): Promise<string> {
  const signedUrlResult = await client.storage
    .from(getBucketName())
    .createSignedUrl(objectPath, getSignedUrlTtlSeconds());
  if (signedUrlResult.error) {
    throw new SupabaseStorageServiceError(
      'SUPABASE_STORAGE_URL_FAILED',
      signedUrlResult.error.message || 'Supabase Storage did not return a signed URL',
      502,
    );
  }

  const accessUrl = signedUrlResult.data?.signedUrl?.trim();
  if (!accessUrl) {
    throw new SupabaseStorageServiceError(
      'SUPABASE_STORAGE_URL_FAILED',
      'Supabase Storage did not return a signed URL for the uploaded media',
      502,
    );
  }

  return accessUrl;
}

export function normalizeIncidentMediaUrl(mediaUrl: string): string {
  const trimmed = mediaUrl.trim();
  const managedReference = tryExtractManagedReference(trimmed);
  if (managedReference) {
    return buildManagedMediaReference(managedReference.bucket, managedReference.objectPath);
  }

  if (getStorageAccessMode() !== 'signed') {
    return trimmed;
  }

  const parsed = tryExtractManagedObjectPath(trimmed);
  if (!parsed) {
    return trimmed;
  }

  return buildManagedMediaReference(parsed.bucket, parsed.objectPath);
}

export async function resolveIncidentMediaUrls(mediaUrls: string[]): Promise<string[]> {
  if (mediaUrls.length === 0) {
    return [];
  }

  const accessMode = getStorageAccessMode();
  const bucket = getConfiguredBucketName();
  const needsManagedResolution = mediaUrls.some((mediaUrl) =>
    tryExtractManagedObjectPath(mediaUrl),
  );

  if (!needsManagedResolution) {
    return mediaUrls;
  }

  const client = accessMode === 'signed' ? createStorageClient() : null;

  return Promise.all(
    mediaUrls.map(async (mediaUrl) => {
      const parsed = tryExtractManagedObjectPath(mediaUrl);
      if (!parsed || (bucket && parsed.bucket !== bucket)) {
        return mediaUrl;
      }

      try {
        if (accessMode === 'signed') {
          return await getSignedMediaUrl(
            client as ReturnType<typeof createStorageClient>,
            parsed.objectPath,
          );
        }

        if (tryExtractManagedReference(mediaUrl.trim())) {
          return buildPublicMediaUrl(parsed.bucket, parsed.objectPath);
        }

        return mediaUrl;
      } catch {
        return mediaUrl;
      }
    }),
  );
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

  const accessMode = getStorageAccessMode();
  const accessUrl =
    accessMode === 'signed'
      ? await getSignedMediaUrl(client, objectPath)
      : buildPublicMediaUrl(bucket, objectPath);
  const mediaUrl =
    accessMode === 'signed' ? buildManagedMediaReference(bucket, objectPath) : accessUrl;

  const upload = {
    bucket,
    objectPath,
    mediaUrl,
    accessUrl,
    contentType: normalizedContentType,
    fileName: sanitizeFileName(input.fileName),
    size: fileBuffer.length,
  };

  try {
    await submitMediaScanRequest(input, upload);
  } catch (error) {
    await removeUploadedObject(client, bucket, objectPath);
    throw new SupabaseStorageServiceError(
      'SUPABASE_STORAGE_SCAN_FAILED',
      error instanceof Error ? error.message : 'Incident media scanning is not available',
      503,
    );
  }

  return upload;
}
