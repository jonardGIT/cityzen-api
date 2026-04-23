import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';

jest.setTimeout(120000);

/**
 * Comprehensive CRUD Factory Tests
 *
 * Tests the generic CRUD engine that powers citizens, agencies, responders,
 * statuses, categories, severities, assignments endpoints.
 *
 * Covers:
 * - Happy-path CRUD lifecycle
 * - Input validation & edge cases
 * - UUID parameter validation
 * - Foreign key validation
 * - Delete guards (referential integrity)
 * - Archive/restore flow
 * - Pagination, sorting, filtering
 * - Include (relation expansion) validation
 * - Empty & boundary payloads
 */

let adminToken: string;

async function loginAdmin(): Promise<string> {
  const res = await request(app).post(`${API_V1}/auth/login`).send({
    email: 'admin@xypes.local',
    password: 'Password123!',
  });
  return res.body.token;
}

beforeAll(async () => {
  adminToken = await loginAdmin();
});

// ─── Status CRUD (simplest factory resource) ─────────────────────────────────

describe('CRUD Factory — Statuses', () => {
  let statusId: string;

  it('creates a status', async () => {
    const res = await request(app)
      .post(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Status' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Test Status');
    statusId = res.body.id;
  });

  it('lists statuses', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('gets a status by id', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses/${statusId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(statusId);
  });

  it('updates a status', async () => {
    const res = await request(app)
      .patch(`${API_V1}/statuses/${statusId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Status' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Status');
  });

  it('returns 404 for non-existent status', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000';
    const res = await request(app)
      .get(`${API_V1}/statuses/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID param', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses/not-a-uuid`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('returns 400 when required field is missing on create', async () => {
    const res = await request(app)
      .post(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('rejects empty-string name on create', async () => {
    const res = await request(app)
      .post(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('rejects whitespace-only name on create', async () => {
    const res = await request(app)
      .post(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '   ' });

    expect(res.status).toBe(400);
  });

  it('rejects update with no recognized fields', async () => {
    const res = await request(app)
      .patch(`${API_V1}/statuses/${statusId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ unknownField: 'value' });

    expect(res.status).toBe(400);
  });

  it('deletes/archives a status', async () => {
    const res = await request(app)
      .delete(`${API_V1}/statuses/${statusId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 after deletion', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses/${statusId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ─── Category CRUD with subCategory nullable field ───────────────────────────

describe('CRUD Factory — Categories', () => {
  let categoryId: string;

  it('creates a category with optional nullable field omitted', async () => {
    const res = await request(app)
      .post(`${API_V1}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Category' });

    expect(res.status).toBe(201);
    expect(res.body.subCategory).toBeNull();
    categoryId = res.body.id;
  });

  it('updates category with nullable field', async () => {
    const res = await request(app)
      .patch(`${API_V1}/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subCategory: 'Sub A' });

    expect(res.status).toBe(200);
    expect(res.body.subCategory).toBe('Sub A');
  });

  it('clears nullable field with null value on update', async () => {
    const res = await request(app)
      .patch(`${API_V1}/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subCategory: null });

    expect(res.status).toBe(200);
    expect(res.body.subCategory).toBeNull();
  });

  afterAll(async () => {
    if (categoryId) {
      await request(app)
        .delete(`${API_V1}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
  });
});

// ─── Severity CRUD with unique constraint ────────────────────────────────────

describe('CRUD Factory — Severities', () => {
  const uniqueLevel = `level_${Date.now()}`;
  let severityId: string;

  it('creates a severity with unique level', async () => {
    const res = await request(app)
      .post(`${API_V1}/severities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: uniqueLevel, definition: 'Test definition' });

    expect(res.status).toBe(201);
    severityId = res.body.id;
  });

  it('rejects duplicate severity level', async () => {
    const res = await request(app)
      .post(`${API_V1}/severities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: uniqueLevel, definition: 'Duplicate' });

    expect(res.status).toBe(409);
  });

  afterAll(async () => {
    if (severityId) {
      await request(app)
        .delete(`${API_V1}/severities/${severityId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
  });
});

// ─── Agencies & Responders (foreign key validation, delete guards) ───────────

describe('CRUD Factory — Agencies & Responders (FK + Delete Guard)', () => {
  let agencyId: string;
  let responderId: string;

  it('creates an agency', async () => {
    const res = await request(app)
      .post(`${API_V1}/agencies`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Agency' });

    expect(res.status).toBe(201);
    agencyId = res.body.id;
  });

  it('creates a responder linked to the agency', async () => {
    const res = await request(app)
      .post(`${API_V1}/responders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Responder',
        agencyId,
        role: 'Firefighter',
        contactInfo: 'resp@test.local',
      });

    expect(res.status).toBe(201);
    responderId = res.body.id;
  });

  it('rejects responder with non-existent agencyId', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000';
    const res = await request(app)
      .post(`${API_V1}/responders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Bad FK Responder',
        agencyId: fakeId,
        role: 'Test',
        contactInfo: 'bad@test.local',
      });

    expect(res.status).toBe(422);
  });

  it('rejects responder with invalid UUID for agencyId', async () => {
    const res = await request(app)
      .post(`${API_V1}/responders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Bad UUID Responder',
        agencyId: 'not-a-uuid',
        role: 'Test',
        contactInfo: 'baduuid@test.local',
      });

    expect(res.status).toBe(400);
  });

  it('prevents deleting agency with active responders (delete guard)', async () => {
    const res = await request(app)
      .delete(`${API_V1}/agencies/${agencyId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/responder/i);
  });

  afterAll(async () => {
    if (responderId) {
      await request(app)
        .delete(`${API_V1}/responders/${responderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    if (agencyId) {
      await request(app)
        .delete(`${API_V1}/agencies/${agencyId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
  });
});

// ─── Pagination ──────────────────────────────────────────────────────────────

describe('CRUD Factory — Pagination', () => {
  it('returns paginated response with metadata', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses?page=1&pageSize=2`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('page', 1);
    expect(res.body.pagination).toHaveProperty('pageSize', 2);
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('totalPages');
    expect(res.body.pagination).toHaveProperty('hasNextPage');
    expect(res.body.pagination).toHaveProperty('hasPrevPage');
  });

  it('clamps pageSize to maximum allowed', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses?page=1&pageSize=9999`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.pageSize).toBeLessThanOrEqual(100);
  });
});

// ─── Sorting ─────────────────────────────────────────────────────────────────

describe('CRUD Factory — Sorting', () => {
  it('accepts valid sortBy/sortOrder', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses?sortBy=createdAt&sortOrder=asc`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('rejects invalid sortOrder', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses?sortOrder=INVALID`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(422);
  });
});

// ─── Include (relation expansion) ────────────────────────────────────────────

describe('CRUD Factory — Include parameter', () => {
  it('rejects invalid include relation', async () => {
    const res = await request(app)
      .get(`${API_V1}/citizens?include=nonExistentRelation`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid include/i);
  });

  it('accepts valid include relation (citizens → incidents)', async () => {
    const res = await request(app)
      .get(`${API_V1}/citizens?include=incidents`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

// ─── Archive scope filtering ─────────────────────────────────────────────────

describe('CRUD Factory — Archive scope', () => {
  let archivedStatusId: string;

  beforeAll(async () => {
    const createRes = await request(app)
      .post(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Archive Scope Test' });
    archivedStatusId = createRes.body.id;

    await request(app)
      .delete(`${API_V1}/statuses/${archivedStatusId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  it('active scope excludes archived records', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const ids = (Array.isArray(res.body) ? res.body : res.body.data || []).map((r: any) => r.id);
    expect(ids).not.toContain(archivedStatusId);
  });

  it('archived scope returns only archived records', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses?archivedOnly=true`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const records = Array.isArray(res.body) ? res.body : res.body.data || [];
    for (const record of records) {
      expect(record.archivedAt).not.toBeNull();
    }
  });

  it('all scope returns both active and archived records', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses?includeArchived=true`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const ids = (Array.isArray(res.body) ? res.body : res.body.data || []).map((r: any) => r.id);
    expect(ids).toContain(archivedStatusId);
  });
});

// ─── Restore flow ────────────────────────────────────────────────────────────

describe('CRUD Factory — Restore', () => {
  let statusId: string;

  it('restore lifecycle: create → archive → restore', async () => {
    const createRes = await request(app)
      .post(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Restore Test Status' });
    statusId = createRes.body.id;

    await request(app)
      .delete(`${API_V1}/statuses/${statusId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const getRes = await request(app)
      .get(`${API_V1}/statuses/${statusId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(404);

    const restoreRes = await request(app)
      .post(`${API_V1}/statuses/${statusId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.id).toBe(statusId);

    const afterRestore = await request(app)
      .get(`${API_V1}/statuses/${statusId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterRestore.status).toBe(200);
  });

  it('returns 404 when restoring a non-existent archived record', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000001';
    const res = await request(app)
      .post(`${API_V1}/statuses/${fakeId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  afterAll(async () => {
    if (statusId) {
      await request(app)
        .delete(`${API_V1}/statuses/${statusId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
  });
});
