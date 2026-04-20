import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

import '../src/env.js';
import {
  authenticateSupabaseUser,
  deleteSupabaseAuthUser,
  isSupabaseAuthEnabled,
  registerSupabaseAuthUser,
  SupabaseAuthServiceError,
} from '../src/services/supabaseAuthService.js';
import { normalizeUserRoleInput, type UserRole } from '../src/types/auth.js';

if (process.env.DIRECT_URL?.trim()) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const { default: prisma } = await import('../src/lib/prisma.js');

type CliOptions = {
  name: string | null;
  email: string | null;
  password: string | null;
  role: UserRole;
  help: boolean;
};

const LEGACY_STORAGE_ROLE_ALIASES: Partial<Record<UserRole, string>> = {
  NATIONAL_ADMIN: 'SYSTEM_ADMIN',
  CITY_ADMIN: 'DEPARTMENT_MANAGER',
  PROVINCIAL_ADMIN: 'SUPERVISOR',
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function buildManagedPasswordHash(): Promise<string> {
  return bcrypt.hash(`supabase-managed:${randomUUID()}`, 10);
}

function isUsersRoleConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('users_role_check');
}

function getStorageRoleCandidates(role: UserRole): string[] {
  const legacyAlias = LEGACY_STORAGE_ROLE_ALIASES[role];
  return legacyAlias ? [role, legacyAlias] : [role];
}

async function persistBootstrapUser(input: {
  existingUserId: string | null;
  name: string;
  email: string;
  role: UserRole;
  supabaseAuthUserId: string | null;
  passwordHash: string;
}) {
  const storageRoles = getStorageRoleCandidates(input.role);
  let lastError: unknown;

  for (const storageRole of storageRoles) {
    try {
      if (input.existingUserId) {
        return await prisma.user.update({
          where: { id: input.existingUserId },
          data: {
            name: input.name,
            role: storageRole,
            supabaseAuthUserId: input.supabaseAuthUserId ?? undefined,
            passwordHash: input.passwordHash,
          },
          select: {
            id: true,
            email: true,
            role: true,
            supabaseAuthUserId: true,
          },
        });
      }

      return await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: storageRole,
          supabaseAuthUserId: input.supabaseAuthUserId ?? undefined,
          passwordHash: input.passwordHash,
        },
        select: {
          id: true,
          email: true,
          role: true,
          supabaseAuthUserId: true,
        },
      });
    } catch (error) {
      lastError = error;
      if (!isUsersRoleConstraintError(error) || storageRole === storageRoles.at(-1)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to persist bootstrap user.');
}

function parseArgs(argv: string[]): CliOptions {
  let name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || null;
  let email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() || null;
  let password = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim() || null;
  let role = normalizeUserRoleInput(process.env.BOOTSTRAP_ADMIN_ROLE) ?? 'NATIONAL_ADMIN';
  let help = false;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }

    if (arg.startsWith('--name=')) {
      name = arg.slice('--name='.length).trim() || null;
      continue;
    }

    if (arg.startsWith('--email=')) {
      email = arg.slice('--email='.length).trim() || null;
      continue;
    }

    if (arg.startsWith('--password=')) {
      password = arg.slice('--password='.length).trim() || null;
      continue;
    }

    if (arg.startsWith('--role=')) {
      const parsedRole = normalizeUserRoleInput(arg.slice('--role='.length));
      if (!parsedRole) {
        throw new Error('Invalid --role value. Use one of the supported API user roles.');
      }

      role = parsedRole;
    }
  }

  return { name, email, password, role, help };
}

function printHelp(): void {
  console.log(`Create or promote a single admin user without loading demo seed data.

Usage:
  NODE_ENV=production ENV_FILE=.env npm run bootstrap:admin -- --name="System Admin" --email="admin@example.com" --password="StrongPassword123!" --role=SYSTEM_ADMIN

Environment variable alternatives:
  BOOTSTRAP_ADMIN_NAME
  BOOTSTRAP_ADMIN_EMAIL
  BOOTSTRAP_ADMIN_PASSWORD
  BOOTSTRAP_ADMIN_ROLE

Notes:
  - This never truncates tables.
  - When Supabase Auth is enabled, it also creates or links the Supabase Auth account.
  - When the local user already exists, the script updates the name and role in place.
`);
}

async function ensureBootstrapUserSchema(): Promise<void> {
  await prisma.$executeRawUnsafe('ALTER TABLE users ALTER COLUMN "passwordHash" DROP NOT NULL');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "supabaseAuthUserId" uuid',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS users_supabase_auth_user_id_idx ON users ("supabaseAuthUserId") WHERE "supabaseAuthUserId" IS NOT NULL',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaEnabled" boolean NOT NULL DEFAULT false',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaSecretEncrypted" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaEnabledAt" timestamptz',
  );
}

async function ensureSupabaseIdentity(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  existingSupabaseAuthUserId: string | null;
}): Promise<{ supabaseAuthUserId: string | null; createdSupabaseUser: boolean }> {
  if (!isSupabaseAuthEnabled()) {
    return { supabaseAuthUserId: null, createdSupabaseUser: false };
  }

  if (input.existingSupabaseAuthUserId) {
    return {
      supabaseAuthUserId: input.existingSupabaseAuthUserId,
      createdSupabaseUser: false,
    };
  }

  try {
    const createdUser = await registerSupabaseAuthUser({
      email: input.email,
      password: input.password,
      name: input.name,
      role: input.role,
    });

    return {
      supabaseAuthUserId: createdUser.id,
      createdSupabaseUser: true,
    };
  } catch (error) {
    if (error instanceof SupabaseAuthServiceError && error.code === 'EMAIL_CONFLICT') {
      const existingUser = await authenticateSupabaseUser({
        email: input.email,
        password: input.password,
      });

      return {
        supabaseAuthUserId: existingUser.id,
        createdSupabaseUser: false,
      };
    }

    throw error;
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.name || !options.email || !options.password) {
    throw new Error('name, email, and password are required. Use --help for usage.');
  }

  if (!isStrongPassword(options.password)) {
    throw new Error(
      'The bootstrap password must be at least 12 characters and include uppercase, lowercase, number, and symbol characters.',
    );
  }

  const email = normalizeEmail(options.email);
  const name = options.name.trim();

  await ensureBootstrapUserSchema();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      supabaseAuthUserId: true,
      role: true,
    },
  });

  const { supabaseAuthUserId, createdSupabaseUser } = await ensureSupabaseIdentity({
    email,
    password: options.password,
    name,
    role: options.role,
    existingSupabaseAuthUserId: existingUser?.supabaseAuthUserId ?? null,
  });

  try {
    const passwordHash = isSupabaseAuthEnabled()
      ? await buildManagedPasswordHash()
      : await bcrypt.hash(options.password, 10);

    const user = await persistBootstrapUser({
      existingUserId: existingUser?.id ?? null,
      name,
      email,
      role: options.role,
      supabaseAuthUserId,
      passwordHash,
    });

    console.log(
      JSON.stringify(
        {
          action: existingUser ? 'updated' : 'created',
          authProvider: isSupabaseAuthEnabled() ? 'supabase' : 'local',
          createdSupabaseUser,
          user,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (createdSupabaseUser && supabaseAuthUserId) {
      await deleteSupabaseAuthUser(supabaseAuthUserId).catch(() => undefined);
    }

    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
