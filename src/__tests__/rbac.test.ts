import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';

jest.setTimeout(120000);

/**
 * Role-Based Access Control (RBAC) — Comprehensive Tests
 *
 * Covers:
 * - Role hierarchy enforcement
 * - Unauthorized access attempts for each role
 * - Cross-role resource access
 * - Privilege escalation prevention
 * - User management role constraints
 * - Admin-only endpoint protection
 * - Audit log access restrictions
 * - CITIZEN_REPORTER scope isolation
 */

const ROLES_AND_EMAILS: Record<string, string> = {
  SYSTEM_ADMIN: 'admin@xypes.local',
  DEPARTMENT_MANAGER: 'ops.lead@xypes.local',
  DISPATCHER: 'dispatcher@xypes.local',
  SUPERVISOR: 'supervisor@xypes.local',
  RESPONDER: 'responder@xypes.local',
  CITIZEN_REPORTER: 'analyst@xypes.local',
  AUDITOR: 'auditor@xypes.local',
};

const tokens: Record<string, string> = {};

async function loginAs(email: string): Promise<string> {
  const res = await request(app).post(`${API_V1}/auth/login`).send({
    email,
    password: 'Password123!',
  });
  return res.body.token;
}

beforeAll(async () => {
  for (const [role, email] of Object.entries(ROLES_AND_EMAILS)) {
    tokens[role] = await loginAs(email);
  }
});

// ─── Read Access ─────────────────────────────────────────────────────────────

describe('RBAC — Read access', () => {
  // These endpoints are readable by all authenticated roles
  const publicReadEndpoints = ['/statuses', '/categories', '/severities'];
  // These require DISPATCH_ROLES (SYSTEM_ADMIN, DEPARTMENT_MANAGER, SUPERVISOR, DISPATCHER)
  const dispatchReadEndpoints = ['/agencies', '/responders'];
  // These require ADMIN_ROLES (SYSTEM_ADMIN, DEPARTMENT_MANAGER)
  const adminReadEndpoints = ['/citizens'];

  for (const endpoint of publicReadEndpoints) {
    it(`allows any authenticated user to GET ${endpoint}`, async () => {
      for (const [role, token] of Object.entries(tokens)) {
        const res = await request(app)
          .get(`${API_V1}${endpoint}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
      }
    });
  }

  for (const endpoint of dispatchReadEndpoints) {
    it(`allows dispatch roles to GET ${endpoint}`, async () => {
      const dispatchRoles = ['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER'];
      for (const role of dispatchRoles) {
        const res = await request(app)
          .get(`${API_V1}${endpoint}`)
          .set('Authorization', `Bearer ${tokens[role]}`);
        expect(res.status).toBe(200);
      }
    });

    it(`denies non-dispatch roles from GET ${endpoint}`, async () => {
      const deniedRoles = ['CITIZEN_REPORTER', 'RESPONDER', 'AUDITOR'];
      for (const role of deniedRoles) {
        const res = await request(app)
          .get(`${API_V1}${endpoint}`)
          .set('Authorization', `Bearer ${tokens[role]}`);
        expect(res.status).toBe(403);
      }
    });
  }

  for (const endpoint of adminReadEndpoints) {
    it(`allows admin roles to GET ${endpoint}`, async () => {
      const adminRoles = ['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'];
      for (const role of adminRoles) {
        const res = await request(app)
          .get(`${API_V1}${endpoint}`)
          .set('Authorization', `Bearer ${tokens[role]}`);
        expect(res.status).toBe(200);
      }
    });

    it(`denies non-admin roles from GET ${endpoint}`, async () => {
      const deniedRoles = ['SUPERVISOR', 'DISPATCHER', 'CITIZEN_REPORTER', 'RESPONDER', 'AUDITOR'];
      for (const role of deniedRoles) {
        const res = await request(app)
          .get(`${API_V1}${endpoint}`)
          .set('Authorization', `Bearer ${tokens[role]}`);
        expect(res.status).toBe(403);
      }
    });
  }
});

// ─── Write Access ────────────────────────────────────────────────────────────

describe('RBAC — Write access restrictions', () => {
  const readOnlyRoles = ['CITIZEN_REPORTER', 'RESPONDER', 'AUDITOR'];
  const writeEndpoints = [
    { method: 'post', path: '/statuses', body: { name: 'RBAC Test Status' } },
    { method: 'post', path: '/categories', body: { name: 'RBAC Test Cat' } },
  ];

  for (const endpoint of writeEndpoints) {
    for (const role of readOnlyRoles) {
      it(`denies ${role} from ${endpoint.method.toUpperCase()} ${endpoint.path}`, async () => {
        const res = await (request(app) as any)
          [endpoint.method](`${API_V1}${endpoint.path}`)
          .set('Authorization', `Bearer ${tokens[role]}`)
          .send(endpoint.body);

        expect(res.status).toBe(403);
      });
    }
  }
});

// ─── User Management ─────────────────────────────────────────────────────────

describe('RBAC — User management hierarchy', () => {
  it('SYSTEM_ADMIN can create user with DISPATCHER role', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${tokens.SYSTEM_ADMIN}`)
      .send({
        name: `RBAC Dispatcher ${stamp}`,
        email: `rbac.dispatcher.${stamp}@test.local`,
        password: 'Password123!',
        role: 'DISPATCHER',
      });

    expect(res.status).toBe(201);
  });

  it('SYSTEM_ADMIN cannot create another SYSTEM_ADMIN', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${tokens.SYSTEM_ADMIN}`)
      .send({
        name: `RBAC Admin ${stamp}`,
        email: `rbac.admin.${stamp}@test.local`,
        password: 'Password123!',
        role: 'SYSTEM_ADMIN',
      });

    expect(res.status).toBe(403);
  });

  it('SYSTEM_ADMIN cannot create AUDITOR', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${tokens.SYSTEM_ADMIN}`)
      .send({
        name: `RBAC Auditor ${stamp}`,
        email: `rbac.auditor.${stamp}@test.local`,
        password: 'Password123!',
        role: 'AUDITOR',
      });

    expect(res.status).toBe(403);
  });

  it('DEPARTMENT_MANAGER can create RESPONDER', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${tokens.DEPARTMENT_MANAGER}`)
      .send({
        name: `RBAC Responder ${stamp}`,
        email: `rbac.responder.${stamp}@test.local`,
        password: 'Password123!',
        role: 'RESPONDER',
      });

    expect(res.status).toBe(201);
  });

  it('DEPARTMENT_MANAGER cannot create SYSTEM_ADMIN (escalation prevention)', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${tokens.DEPARTMENT_MANAGER}`)
      .send({
        name: `RBAC Esc ${stamp}`,
        email: `rbac.esc.${stamp}@test.local`,
        password: 'Password123!',
        role: 'SYSTEM_ADMIN',
      });

    expect(res.status).toBe(403);
  });

  it('DEPARTMENT_MANAGER cannot create DEPARTMENT_MANAGER (lateral escalation)', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${tokens.DEPARTMENT_MANAGER}`)
      .send({
        name: `RBAC Lateral ${stamp}`,
        email: `rbac.lateral.${stamp}@test.local`,
        password: 'Password123!',
        role: 'DEPARTMENT_MANAGER',
      });

    expect(res.status).toBe(403);
  });

  it('DISPATCHER cannot create users', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${tokens.DISPATCHER}`)
      .send({
        name: `RBAC NoCreate ${stamp}`,
        email: `rbac.nocreate.${stamp}@test.local`,
        password: 'Password123!',
        role: 'CITIZEN_REPORTER',
      });

    expect(res.status).toBe(403);
  });

  it('CITIZEN_REPORTER cannot create users', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${tokens.CITIZEN_REPORTER}`)
      .send({
        name: `RBAC NoCreate ${stamp}`,
        email: `rbac.citizen.${stamp}@test.local`,
        password: 'Password123!',
        role: 'CITIZEN_REPORTER',
      });

    expect(res.status).toBe(403);
  });
});

// ─── Admin Endpoints ─────────────────────────────────────────────────────────

describe('RBAC — Admin endpoints', () => {
  it('SYSTEM_ADMIN can access admin users endpoint', async () => {
    const res = await request(app)
      .get(`${API_V1}/admin/users`)
      .set('Authorization', `Bearer ${tokens.SYSTEM_ADMIN}`);

    expect(res.status).toBe(200);
  });

  it('SYSTEM_ADMIN can access MFA compliance report', async () => {
    const res = await request(app)
      .get(`${API_V1}/admin/users/mfa-compliance`)
      .set('Authorization', `Bearer ${tokens.SYSTEM_ADMIN}`);

    expect(res.status).toBe(200);
  });

  it('CITIZEN_REPORTER cannot access admin endpoints', async () => {
    const res = await request(app)
      .get(`${API_V1}/admin/users`)
      .set('Authorization', `Bearer ${tokens.CITIZEN_REPORTER}`);

    expect(res.status).toBe(403);
  });

  it('RESPONDER cannot access admin endpoints', async () => {
    const res = await request(app)
      .get(`${API_V1}/admin/users/mfa-compliance`)
      .set('Authorization', `Bearer ${tokens.RESPONDER}`);

    expect(res.status).toBe(403);
  });

  it('DISPATCHER cannot access admin endpoints', async () => {
    const res = await request(app)
      .get(`${API_V1}/admin/users`)
      .set('Authorization', `Bearer ${tokens.DISPATCHER}`);

    expect(res.status).toBe(403);
  });
});

// ─── Audit Logs ──────────────────────────────────────────────────────────────

describe('RBAC — Audit log access', () => {
  it('SYSTEM_ADMIN can read audit logs', async () => {
    const res = await request(app)
      .get(`${API_V1}/audit-logs`)
      .set('Authorization', `Bearer ${tokens.SYSTEM_ADMIN}`);

    expect(res.status).toBe(200);
  });

  it('AUDITOR can read audit logs', async () => {
    const res = await request(app)
      .get(`${API_V1}/audit-logs`)
      .set('Authorization', `Bearer ${tokens.AUDITOR}`);

    expect(res.status).toBe(200);
  });

  it('CITIZEN_REPORTER cannot read audit logs', async () => {
    const res = await request(app)
      .get(`${API_V1}/audit-logs`)
      .set('Authorization', `Bearer ${tokens.CITIZEN_REPORTER}`);

    expect(res.status).toBe(403);
  });

  it('DISPATCHER cannot read audit logs', async () => {
    const res = await request(app)
      .get(`${API_V1}/audit-logs`)
      .set('Authorization', `Bearer ${tokens.DISPATCHER}`);

    expect(res.status).toBe(403);
  });
});

// ─── User Capabilities ──────────────────────────────────────────────────────

describe('RBAC — Capabilities endpoint', () => {
  for (const [role, token] of Object.entries(tokens)) {
    it(`returns capabilities for ${role}`, async () => {
      const res = await request(app)
        .get(`${API_V1}/users/capabilities`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('role', role);
      expect(res.body).toHaveProperty('permissions');
      expect(res.body).toHaveProperty('scope');
      expect(Array.isArray(res.body.permissions)).toBe(true);
    });
  }
});
