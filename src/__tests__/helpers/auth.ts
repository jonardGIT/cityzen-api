import request from 'supertest';
import app, { API_V1 } from '../../app.js';

const ADMIN_EMAIL = 'admin@xypes.local';
const ADMIN_PASSWORD = 'Password123!';
const MAX_LOGIN_ATTEMPTS = 5;
const RETRY_DELAY_MS = 1000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loginAsAdmin(): Promise<string> {
  let lastStatus: number | null = null;
  let lastMessage = 'Unknown login failure';

  for (let attempt = 1; attempt <= MAX_LOGIN_ATTEMPTS; attempt += 1) {
    const response = await request(app).post(`${API_V1}/auth/login`).send({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (response.status === 200 && response.body?.token) {
      return response.body.token as string;
    }

    lastStatus = response.status;
    lastMessage = response.body?.message ?? response.text ?? 'Login request failed';

    if (attempt < MAX_LOGIN_ATTEMPTS) {
      await wait(RETRY_DELAY_MS * attempt);
    }
  }

  throw new Error(
    `Admin login failed after ${MAX_LOGIN_ATTEMPTS} attempts: ${lastStatus ?? 'no status'} ${lastMessage}`,
  );
}

export async function getAdminToken(): Promise<string> {
  return loginAsAdmin();
}

export async function getTokenForRole(email: string): Promise<string> {
  const response = await request(app).post(`${API_V1}/auth/login`).send({
    email,
    password: 'Password123!',
  });

  if (response.status === 200 && response.body?.token) {
    return response.body.token as string;
  }

  throw new Error(`Login failed for ${email}: ${response.status} ${response.body?.message ?? ''}`);
}
