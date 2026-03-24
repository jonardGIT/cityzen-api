import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import app, { API_V1 } from '../src/app.js';
dotenv.config({ path: '.env.development' });
const prisma = new PrismaClient();
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function average(values) {
    if (values.length === 0) {
        return null;
    }
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
function normalizeError(error) {
    if (error instanceof Error) {
        return error.message.replace(/\s+/g, ' ').slice(0, 220);
    }
    return String(error);
}
async function runPrismaProbe(attempts) {
    const failures = [];
    const durations = [];
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const startedAt = Date.now();
        try {
            await prisma.user.count();
            const elapsed = Date.now() - startedAt;
            durations.push(elapsed);
            console.log(`PRISMA_OK ${attempt} ${elapsed}ms`);
        }
        catch (error) {
            const message = normalizeError(error);
            failures.push({ attempt, message });
            console.log(`PRISMA_FAIL ${attempt} ${message}`);
        }
        await sleep(300);
    }
    return {
        attempts,
        successCount: durations.length,
        failureCount: failures.length,
        avgMs: average(durations),
        failures,
    };
}
async function runAuthProbe(attempts) {
    const failures = [];
    const durations = [];
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const startedAt = Date.now();
        try {
            const response = await request(app).post(`${API_V1}/auth/login`).send({
                email: 'admin@xypes.local',
                password: 'Password123!',
            });
            const elapsed = Date.now() - startedAt;
            if (response.status === 200 && response.body?.token) {
                durations.push(elapsed);
                console.log(`LOGIN_OK ${attempt} ${elapsed}ms`);
            }
            else {
                const message = `${response.status} ${(response.body?.message ?? response.text ?? '')
                    .toString()
                    .replace(/\s+/g, ' ')
                    .slice(0, 180)}`;
                failures.push({ attempt, message });
                console.log(`LOGIN_FAIL ${attempt} ${message}`);
            }
        }
        catch (error) {
            const message = normalizeError(error);
            failures.push({ attempt, message });
            console.log(`LOGIN_THROW ${attempt} ${message}`);
        }
        await sleep(300);
    }
    return {
        attempts,
        successCount: durations.length,
        failureCount: failures.length,
        avgMs: average(durations),
        failures,
    };
}
async function main() {
    const attempts = 15;
    try {
        console.log('=== PRISMA PROBE ===');
        const prismaSummary = await runPrismaProbe(attempts);
        console.log(JSON.stringify({ probe: 'prisma', ...prismaSummary }, null, 2));
        console.log('=== AUTH PROBE ===');
        const authSummary = await runAuthProbe(attempts);
        console.log(JSON.stringify({ probe: 'auth', ...authSummary }, null, 2));
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((error) => {
    console.error(normalizeError(error));
    process.exitCode = 1;
});
