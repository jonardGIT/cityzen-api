import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { getAdminToken } from './helpers/auth.js';
import {
  buildIncidentLocationSnapshot,
  createCitizen as createCitizenFactory,
  createCategory as createCategoryFactory,
  createSeverity as createSeverityFactory,
  getStatusId as getStatusIdFactory,
} from './helpers/factories.js';
import * as supabaseStorageService from '../services/supabaseStorageService.js';
import { isArchiveEnabled } from '../utils/archive.js';

jest.setTimeout(120000);

const BASE = `${API_V1}/incidents`;
let adminToken = '';
const incidentMediaUploadEnabled = supabaseStorageService.isSupabaseStorageEnabled();
const archiveEnabled = isArchiveEnabled();

const createCitizen = () => createCitizenFactory(adminToken);
const createCategory = () => createCategoryFactory(adminToken);
const createSeverity = () => createSeverityFactory(adminToken);
const getStatusId = (name?: string) => getStatusIdFactory(adminToken, name);

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with array', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe(`GET ${BASE}/:id`, () => {
  let createdId = '';

  beforeAll(async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const incidentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Test incident for GET by id',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(incidentRes.status).toBe(201);
    createdId = incidentRes.body.id;
  });

  it('should return 200 for valid id', async () => {
    const res = await request(app)
      .get(`${BASE}/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdId);
  });

  it('should return 404 for unknown id', async () => {
    const unknownId = '11111111-1111-4111-8111-111111111111';
    const res = await request(app)
      .get(`${BASE}/${unknownId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create and return 201 with valid referenced ids', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Test incident',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ description: 'Test incident' });
    expect(res.body).toHaveProperty('latitude');
  });

  it('should create and return 201 with incident location snapshot', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Test incident with coordinate snapshot',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('latitude');
    expect(res.body).toHaveProperty('longitude');
  });

  it('should return 400 when snapshot fields are not provided', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      description: 'Missing incident location snapshot',
      statusId,
      citizenId,
      categoryId,
      severityId,
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Missing ids' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 for invalid foreign key reference', async () => {
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Bad ref',
        statusId: 'not-a-real-uuid',
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(400);
  });
});

describe(`POST ${BASE}/media/upload`, () => {
  const originalStorageEnabled = process.env.SUPABASE_STORAGE_ENABLED;
  const originalStorageAccessMode = process.env.SUPABASE_STORAGE_ACCESS_MODE;

  afterEach(() => {
    if (originalStorageEnabled === undefined) {
      delete process.env.SUPABASE_STORAGE_ENABLED;
    } else {
      process.env.SUPABASE_STORAGE_ENABLED = originalStorageEnabled;
    }

    if (originalStorageAccessMode === undefined) {
      delete process.env.SUPABASE_STORAGE_ACCESS_MODE;
    } else {
      process.env.SUPABASE_STORAGE_ACCESS_MODE = originalStorageAccessMode;
    }

    jest.restoreAllMocks();
  });

  it('should respect the configured incident media upload feature', async () => {
    if (!incidentMediaUploadEnabled) {
      const res = await request(app)
        .post(`${BASE}/media/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fileName: 'incident-photo.jpg',
          contentType: 'image/jpeg',
          dataBase64: Buffer.from('test-image').toString('base64'),
        });

      expect(res.status).toBe(404);
      return;
    }

    jest
      .spyOn(supabaseStorageService, 'uploadIncidentMedia')
      .mockRejectedValueOnce(
        new supabaseStorageService.SupabaseStorageServiceError(
          'SUPABASE_STORAGE_DISABLED',
          'Supabase Storage is disabled for this environment',
          503,
        ),
      );

    const res = await request(app)
      .post(`${BASE}/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fileName: 'incident-photo.jpg',
        contentType: 'image/jpeg',
        dataBase64: Buffer.from('test-image').toString('base64'),
      });

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      message: 'Supabase Storage is disabled for this environment',
    });
  });

  it('should return 400 when required upload fields are missing', async () => {
    if (!incidentMediaUploadEnabled) {
      const res = await request(app)
        .post(`${BASE}/media/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fileName: 'incident-photo.jpg' });

      expect(res.status).toBe(404);
      return;
    }

    const res = await request(app)
      .post(`${BASE}/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fileName: 'incident-photo.jpg' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should upload incident media and return a reusable mediaUrl', async () => {
    if (!incidentMediaUploadEnabled) {
      const res = await request(app)
        .post(`${BASE}/media/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          files: [
            {
              fileName: 'Test Upload Photo.JPG',
              contentType: 'image/jpeg',
              dataBase64: Buffer.from('test-image').toString('base64'),
            },
          ],
        });

      expect(res.status).toBe(404);
      return;
    }

    const uploadSpy = jest
      .spyOn(supabaseStorageService, 'uploadIncidentMedia')
      .mockResolvedValueOnce({
        bucket: 'incident-media',
        objectPath: 'incidents/2026/04/admin/test-upload-photo.jpg',
        mediaUrl: 'https://example.supabase.co/storage/v1/object/public/incident-media/test.jpg',
        accessUrl: 'https://example.supabase.co/storage/v1/object/public/incident-media/test.jpg',
        contentType: 'image/jpeg',
        fileName: 'test-upload-photo.jpg',
        size: 10,
      })
      .mockResolvedValueOnce({
        bucket: 'incident-media',
        objectPath: 'incidents/2026/04/admin/test-upload-video.mp4',
        mediaUrl: 'https://example.supabase.co/storage/v1/object/public/incident-media/test.mp4',
        accessUrl: 'https://example.supabase.co/storage/v1/object/public/incident-media/test.mp4',
        contentType: 'video/mp4',
        fileName: 'test-upload-video.mp4',
        size: 16,
      });

    const res = await request(app)
      .post(`${BASE}/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        files: [
          {
            fileName: 'Test Upload Photo.JPG',
            contentType: 'image/jpeg',
            dataBase64: Buffer.from('test-image').toString('base64'),
          },
          {
            fileName: 'Test Upload Video.MP4',
            contentType: 'video/mp4',
            dataBase64: Buffer.from('test-video-payload').toString('base64'),
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      mediaUrls: [
        'https://example.supabase.co/storage/v1/object/public/incident-media/test.jpg',
        'https://example.supabase.co/storage/v1/object/public/incident-media/test.mp4',
      ],
      accessUrls: [
        'https://example.supabase.co/storage/v1/object/public/incident-media/test.jpg',
        'https://example.supabase.co/storage/v1/object/public/incident-media/test.mp4',
      ],
    });
    expect(res.body.files).toHaveLength(2);
    expect(uploadSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        fileName: 'Test Upload Photo.JPG',
        contentType: 'image/jpeg',
      }),
    );
    expect(uploadSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        fileName: 'Test Upload Video.MP4',
        contentType: 'video/mp4',
      }),
    );
  });

  it('should return managed references plus accessUrls when signed storage mode is enabled', async () => {
    if (!incidentMediaUploadEnabled) {
      const res = await request(app)
        .post(`${BASE}/media/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fileName: 'incident-photo.jpg',
          contentType: 'image/jpeg',
          dataBase64: Buffer.from('test-image').toString('base64'),
        });

      expect(res.status).toBe(404);
      return;
    }

    process.env.SUPABASE_STORAGE_ACCESS_MODE = 'signed';

    jest.spyOn(supabaseStorageService, 'uploadIncidentMedia').mockResolvedValueOnce({
      bucket: 'incident-media',
      objectPath: 'incidents/2026/04/admin/private-photo.jpg',
      mediaUrl: 'supabase://incident-media/incidents/2026/04/admin/private-photo.jpg',
      accessUrl:
        'https://example.supabase.co/storage/v1/object/sign/incident-media/private-photo.jpg?token=signed',
      contentType: 'image/jpeg',
      fileName: 'private-photo.jpg',
      size: 10,
    });

    const res = await request(app)
      .post(`${BASE}/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fileName: 'Private Photo.jpg',
        contentType: 'image/jpeg',
        dataBase64: Buffer.from('test-image').toString('base64'),
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      mediaUrls: ['supabase://incident-media/incidents/2026/04/admin/private-photo.jpg'],
      accessUrls: [
        'https://example.supabase.co/storage/v1/object/sign/incident-media/private-photo.jpg?token=signed',
      ],
    });
    expect(res.body.files[0]).toMatchObject({
      mediaUrl: 'supabase://incident-media/incidents/2026/04/admin/private-photo.jpg',
      accessUrl:
        'https://example.supabase.co/storage/v1/object/sign/incident-media/private-photo.jpg?token=signed',
    });
  });
});

describe('incident media persistence', () => {
  const originalStorageAccessMode = process.env.SUPABASE_STORAGE_ACCESS_MODE;

  afterEach(() => {
    if (originalStorageAccessMode === undefined) {
      delete process.env.SUPABASE_STORAGE_ACCESS_MODE;
    } else {
      process.env.SUPABASE_STORAGE_ACCESS_MODE = originalStorageAccessMode;
    }

    jest.restoreAllMocks();
  });

  it('should create an incident with multiple mediaUrls and preserve order', async () => {
    process.env.SUPABASE_STORAGE_ACCESS_MODE = 'public';

    const mediaUrls = [
      'https://example.supabase.co/storage/v1/object/public/incident-media/photo-1.jpg',
      'https://example.supabase.co/storage/v1/object/public/incident-media/video-1.mp4',
    ];
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Incident with multiple files',
        mediaUrls,
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body.mediaUrl).toBe(mediaUrls[0]);
    expect(res.body.mediaUrls).toEqual(mediaUrls);

    const fetchRes = await request(app)
      .get(`${BASE}/${res.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.mediaUrls).toEqual(res.body.mediaUrls);
  });

  it('should archive removed media when an incident media list is replaced', async () => {
    process.env.SUPABASE_STORAGE_ACCESS_MODE = 'public';

    const archiveSpy = jest
      .spyOn(supabaseStorageService, 'archiveIncidentMediaUrls')
      .mockResolvedValue([]);
    const originalMediaUrls = [
      'https://example.supabase.co/storage/v1/object/public/incident-media/original-photo.jpg',
      'https://example.supabase.co/storage/v1/object/public/incident-media/original-video.mp4',
    ];

    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Incident media replacement target',
        mediaUrls: originalMediaUrls,
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(createRes.status).toBe(201);

    const patchRes = await request(app)
      .patch(`${BASE}/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mediaUrls: [
          'https://example.supabase.co/storage/v1/object/public/incident-media/replacement-photo.jpg',
        ],
      });

    expect(patchRes.status).toBe(200);
    expect(archiveSpy).toHaveBeenCalledWith(originalMediaUrls);
  });

  it('should store managed references while returning resolved access URLs', async () => {
    process.env.SUPABASE_STORAGE_ACCESS_MODE = 'signed';

    const archiveSpy = jest
      .spyOn(supabaseStorageService, 'archiveIncidentMediaUrls')
      .mockResolvedValue([]);
    const resolveSpy = jest
      .spyOn(supabaseStorageService, 'resolveIncidentMediaUrls')
      .mockImplementation(async (mediaUrls) =>
        mediaUrls.map((mediaUrl) =>
          mediaUrl.replace('supabase://incident-media/', 'https://signed.example/'),
        ),
      );

    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Incident with managed media reference',
        mediaUrls: ['supabase://incident-media/incidents/private/original-photo.jpg'],
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.mediaUrls).toEqual([
      'https://signed.example/incidents/private/original-photo.jpg',
    ]);

    const patchRes = await request(app)
      .patch(`${BASE}/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mediaUrls: ['supabase://incident-media/incidents/private/replacement-photo.jpg'],
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.mediaUrls).toEqual([
      'https://signed.example/incidents/private/replacement-photo.jpg',
    ]);
    expect(archiveSpy).toHaveBeenCalledWith([
      'supabase://incident-media/incidents/private/original-photo.jpg',
    ]);
    expect(resolveSpy).toHaveBeenCalled();
  });

  it('should return a just-in-time access URL for a stored incident media file', async () => {
    const resolveSpy = jest
      .spyOn(supabaseStorageService, 'resolveIncidentMediaUrls')
      .mockImplementation(async (mediaUrls) =>
        mediaUrls.map((mediaUrl) =>
          mediaUrl.replace('supabase://incident-media/', 'https://signed.example/'),
        ),
      );

    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Incident media access target',
        mediaUrls: ['supabase://incident-media/incidents/private/access-photo.jpg'],
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(createRes.status).toBe(201);

    const incidentRecord = await prisma.citizenIncident.findUniqueOrThrow({
      where: { id: createRes.body.id },
      include: {
        mediaFiles: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    const mediaId = incidentRecord.mediaFiles[0]?.id;
    expect(mediaId).toBeTruthy();

    const accessRes = await request(app)
      .get(`${BASE}/${createRes.body.id}/media/${mediaId as string}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(accessRes.status).toBe(200);
    expect(accessRes.body).toMatchObject({
      incidentId: createRes.body.id,
      mediaId,
      displayOrder: 0,
      mediaUrl: 'supabase://incident-media/incidents/private/access-photo.jpg',
      accessUrl: 'https://signed.example/incidents/private/access-photo.jpg',
    });
    expect(resolveSpy).toHaveBeenCalledWith([
      'supabase://incident-media/incidents/private/access-photo.jpg',
    ]);
  });

  it('should archive the incident record without archiving storage media when an incident is deleted', async () => {
    const archiveSpy = jest
      .spyOn(supabaseStorageService, 'archiveIncidentMediaUrls')
      .mockResolvedValue([]);

    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Incident delete archive target',
        mediaUrls: [
          'https://example.supabase.co/storage/v1/object/public/incident-media/delete-photo.jpg',
          'https://example.supabase.co/storage/v1/object/public/incident-media/delete-video.mp4',
        ],
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(createRes.status).toBe(201);

    const deleteRes = await request(app)
      .delete(`${BASE}/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(204);

    const fetchRes = await request(app)
      .get(`${BASE}/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(fetchRes.status).toBe(404);

    if (archiveEnabled) {
      expect(archiveSpy).not.toHaveBeenCalled();
      return;
    }

    expect(archiveSpy).toHaveBeenCalledWith([
      'https://example.supabase.co/storage/v1/object/public/incident-media/delete-photo.jpg',
      'https://example.supabase.co/storage/v1/object/public/incident-media/delete-video.mp4',
    ]);
  });

  it('should handle incident restore behavior according to archive mode', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const agencyRes = await request(app)
      .post(`${API_V1}/agencies`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `IncidentRestoreAgency-${Date.now()}` });
    expect(agencyRes.status).toBe(201);

    const responderRes = await request(app)
      .post(`${API_V1}/responders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `IncidentRestoreResponder-${Date.now()}`,
        agencyId: agencyRes.body.id,
        role: 'Field Responder',
        contactInfo: `restore-${Date.now()}@mail.com`,
      });
    expect(responderRes.status).toBe(201);

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Incident restore target',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });
    expect(createRes.status).toBe(201);

    const assignmentRes = await request(app)
      .post(`${API_V1}/assignments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        incidentId: createRes.body.id,
        responderId: responderRes.body.id,
      });
    expect(assignmentRes.status).toBe(201);

    const deleteRes = await request(app)
      .delete(`${BASE}/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (!archiveEnabled) {
      expect(deleteRes.status).toBe(409);

      const restoreRes = await request(app)
        .post(`${BASE}/${createRes.body.id}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(restoreRes.status).toBe(404);
      return;
    }

    expect(deleteRes.status).toBe(204);

    const assignmentAfterDeleteRes = await request(app)
      .get(`${API_V1}/assignments/${assignmentRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(assignmentAfterDeleteRes.status).toBe(404);

    const restoreRes = await request(app)
      .post(`${BASE}/${createRes.body.id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body).toHaveProperty('id', createRes.body.id);

    const assignmentAfterRestoreRes = await request(app)
      .get(`${API_V1}/assignments/${assignmentRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(assignmentAfterRestoreRes.status).toBe(200);
  });
});

describe('VIEWER incident scoping', () => {
  let viewerToken = '';
  let viewerIncidentId = '';
  let viewerCitizenId = '';
  let viewerCategoryId = '';
  let viewerSeverityId = '';

  beforeAll(async () => {
    const unique = Date.now();
    const email = `viewer.${unique}@postman.local`;

    const registerRes = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Viewer ${unique}`,
        email,
        password: 'Password123!',
      });
    expect(registerRes.status).toBe(201);
    viewerToken = registerRes.body.token;

    const linkRes = await request(app)
      .post(`${API_V1}/citizens/link-me`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: `Linked Viewer ${unique}`,
        preferredChannel: 'app',
      });
    expect([200, 201]).toContain(linkRes.status);
    viewerCitizenId = linkRes.body.id;

    viewerCategoryId = await createCategory();
    viewerSeverityId = await createSeverity();

    const reportRes = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Viewer-owned incident',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });
    expect(reportRes.status).toBe(201);
    viewerIncidentId = reportRes.body.id;
  });

  it('GET /incidents returns only the authenticated viewer incidents', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((incident: { citizenId: string }) => {
      expect(incident.citizenId).toBe(viewerCitizenId);
    });
  });

  it('GET /incidents/:id returns 404 for incidents not owned by the viewer', async () => {
    const ownIncident = await request(app)
      .get(`${BASE}/${viewerIncidentId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(ownIncident.status).toBe(200);

    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const otherIncidentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Admin-owned incident for viewer-scope test',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });
    expect(otherIncidentRes.status).toBe(201);

    const blocked = await request(app)
      .get(`${BASE}/${otherIncidentRes.body.id}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(blocked.status).toBe(404);
  });

  it('GET /incidents/:id/media/:mediaId returns 404 for media on incidents not owned by the viewer', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const otherIncidentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Admin-owned incident media for viewer-scope test',
        mediaUrls: ['supabase://incident-media/incidents/private/viewer-blocked-photo.jpg'],
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });
    expect(otherIncidentRes.status).toBe(201);

    const incidentRecord = await prisma.citizenIncident.findUniqueOrThrow({
      where: { id: otherIncidentRes.body.id },
      include: {
        mediaFiles: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    const blocked = await request(app)
      .get(
        `${BASE}/${otherIncidentRes.body.id}/media/${incidentRecord.mediaFiles[0]?.id as string}`,
      )
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(blocked.status).toBe(404);
  });

  it('POST /citizens/link-me rejects contactInfo from client payload', async () => {
    const res = await request(app)
      .post(`${API_V1}/citizens/link-me`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: 'Attempted Override',
        preferredChannel: 'app',
        contactInfo: 'spoofed@example.com',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('POST /incidents/report rejects client-provided citizenId', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Should fail because citizenId is forbidden',
        citizenId: 'not-a-real-uuid',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('POST /incidents/report rejects client-provided statusId', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Should fail because statusId is forbidden',
        statusId: 'uuid-status-1',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('POST /incidents/report accepts coordinate snapshot payload', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Viewer geo incident',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('latitude');
  });

  it('POST /incidents/report auto-assigns Reported status', async () => {
    const reportedStatusId = await getStatusId('Reported');
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Auto status test',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('statusId', reportedStatusId);
  });

  it('POST /incidents/report accepts valid UUID IDs', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Valid UUID id payload',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('POST /incidents/report returns 400 for invalid UUID IDs', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Bad string id payload',
        categoryId: 'uuid-category-1',
        severityId: 'uuid-severity-1',
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});
