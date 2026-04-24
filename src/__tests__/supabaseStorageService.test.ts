import { readFileSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { resetFeatureSelectionCache } from '../featureSelection.js';
import {
  SupabaseStorageServiceError,
  uploadIncidentMedia,
} from '../services/supabaseStorageService.js';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const sampleUploadPath = path.resolve(process.cwd(), 'HEISENBERG-Breaking Bad.jpeg');
const sampleUploadBuffer = readFileSync(sampleUploadPath);
const sampleUploadBase64 = sampleUploadBuffer.toString('base64');

describe('Supabase storage media scan integration', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn(() => {
      throw new Error('Unexpected outbound fetch in supabaseStorageService.test.ts');
    }) as typeof fetch;
    process.env = {
      ...originalEnv,
      FEATURE_MEDIA_STORAGE: 'supabase-storage',
      FEATURE_MFA_MODE: originalEnv.FEATURE_MFA_MODE ?? 'local-totp',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
      SUPABASE_STORAGE_BUCKET: 'incident-media',
      SUPABASE_STORAGE_ACCESS_MODE: 'signed',
      SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
    };
    resetFeatureSelectionCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    resetFeatureSelectionCache();
  });

  it('submits uploaded incident media to the configured media scan webhook', async () => {
    const bucketApi = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({
        data: {
          signedUrl:
            'https://example.supabase.co/storage/v1/object/sign/incident-media/private-photo.jpg?token=signed',
        },
        error: null,
      }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    };
    (createClient as jest.Mock).mockReturnValue({
      storage: {
        from: jest.fn().mockReturnValue(bucketApi),
      },
    });

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as typeof fetch;

    const result = await uploadIncidentMedia({
      actorUserId: 'user-123',
      incidentId: 'incident-123',
      fileName: 'HEISENBERG-Breaking Bad.jpeg',
      contentType: 'image/jpeg',
      dataBase64: sampleUploadBase64,
    });

    expect(result.mediaUrl).toMatch(/^supabase:\/\/incident-media\//);
    expect(result.accessUrl).toContain('/storage/v1/object/sign/');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://security.example.gov/media-scan');
    expect(options.method).toBe('POST');

    const payload = JSON.parse(String(options.body)) as Record<string, unknown>;
    expect(payload).toMatchObject({
      type: 'incident-media-scan',
      actorUserId: 'user-123',
      incidentId: 'incident-123',
      bucket: 'incident-media',
      contentType: 'image/jpeg',
      fileName: 'heisenberg-breaking-bad.jpeg',
      size: sampleUploadBuffer.length,
    });
  });

  it('uploads incident media without calling fetch when no scan webhook is configured', async () => {
    const bucketApi = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({
        data: {
          signedUrl:
            'https://example.supabase.co/storage/v1/object/sign/incident-media/heisenberg-breaking-bad.jpeg?token=signed',
        },
        error: null,
      }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    };
    (createClient as jest.Mock).mockReturnValue({
      storage: {
        from: jest.fn().mockReturnValue(bucketApi),
      },
    });

    delete process.env.SUPABASE_STORAGE_SCAN_WEBHOOK_URL;

    const result = await uploadIncidentMedia({
      actorUserId: 'user-123',
      incidentId: 'incident-123',
      fileName: 'HEISENBERG-Breaking Bad.jpeg',
      contentType: 'image/jpeg',
      dataBase64: sampleUploadBase64,
    });

    expect(result.mediaUrl).toMatch(/^supabase:\/\/incident-media\//);
    expect(result.accessUrl).toContain('/storage/v1/object/sign/');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(bucketApi.remove).not.toHaveBeenCalled();
  });

  it('removes the uploaded object and fails closed when media scan submission is unavailable', async () => {
    const bucketApi = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({
        data: {
          signedUrl:
            'https://example.supabase.co/storage/v1/object/sign/incident-media/private-photo.jpg?token=signed',
        },
        error: null,
      }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    };
    (createClient as jest.Mock).mockReturnValue({
      storage: {
        from: jest.fn().mockReturnValue(bucketApi),
      },
    });

    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 503 } as Response) as typeof fetch;

    await expect(
      uploadIncidentMedia({
        actorUserId: 'user-123',
        incidentId: 'incident-123',
        fileName: 'Private Photo.jpg',
        contentType: 'image/jpeg',
        dataBase64: Buffer.from('test-image').toString('base64'),
      }),
    ).rejects.toMatchObject<Partial<SupabaseStorageServiceError>>({
      code: 'SUPABASE_STORAGE_SCAN_FAILED',
      statusCode: 503,
    });

    const uploadedObjectPath = bucketApi.upload.mock.calls[0]?.[0] as string;
    expect(bucketApi.remove).toHaveBeenCalledWith([uploadedObjectPath]);
  });
});
