import request from 'supertest';
import app, { API_V1 } from '../../app.js';

export function buildIncidentLocationSnapshot() {
  return {
    latitude: 14.5995,
    longitude: 120.9842,
    addressLine1: '123 Rizal Ave',
    cityName: 'Manila',
    provinceName: 'Metro Manila',
    regionName: 'NCR',
    barangay: 'Barangay 123',
  };
}

export async function createCitizen(token: string): Promise<string> {
  const nonce = `${Date.now()}-${Math.random()}`;
  const res = await request(app)
    .post(`${API_V1}/citizens`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Citizen-${nonce}`,
      contactInfo: `citizen-${nonce}@mail.com`,
      preferredChannel: 'app',
    });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

export async function createCategory(token: string): Promise<string> {
  const res = await request(app)
    .post(`${API_V1}/categories`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Category-${Date.now()}-${Math.random()}` });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

export async function createSeverity(token: string): Promise<string> {
  const res = await request(app)
    .post(`${API_V1}/severities`)
    .set('Authorization', `Bearer ${token}`)
    .send({ level: `Severity-${Date.now()}-${Math.random()}` });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

export async function getStatusId(token: string, name?: string): Promise<string> {
  const res = await request(app).get(`${API_V1}/statuses`).set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);

  if (!name) {
    return res.body[0].id as string;
  }

  const match = res.body.find((status: { name: string }) => status.name === name);
  expect(match).toBeTruthy();
  return match.id as string;
}

export async function createAgency(token: string): Promise<string> {
  const res = await request(app)
    .post(`${API_V1}/agencies`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Agency-${Date.now()}-${Math.random()}` });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

export async function createResponder(token: string, agencyId: string): Promise<string> {
  const res = await request(app)
    .post(`${API_V1}/responders`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Responder-${Date.now()}-${Math.random()}`,
      agencyId,
      role: 'TestRole',
      contactInfo: `responder-${Date.now()}@mail.com`,
    });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

export async function createIncident(
  token: string,
  overrides?: Record<string, unknown>,
): Promise<string> {
  const statusId = await getStatusId(token);
  const citizenId = await createCitizen(token);
  const categoryId = await createCategory(token);
  const severityId = await createSeverity(token);

  const res = await request(app)
    .post(`${API_V1}/incidents`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      description: `Test incident ${Date.now()}`,
      statusId,
      citizenId,
      categoryId,
      severityId,
      ...buildIncidentLocationSnapshot(),
      ...overrides,
    });
  expect(res.status).toBe(201);
  return res.body.id as string;
}
