import dotenv from 'dotenv';

import prisma from '../src/lib/prisma.js';
import {
  registerSupabaseAuthUser,
  SupabaseAuthServiceError,
} from '../src/services/supabaseAuthService.js';

dotenv.config({ path: '.env.development' });

const DEFAULT_SEED_EMAILS = [
  'admin@xypes.local',
  'regional.director@xypes.local',
  'supervisor@xypes.local',
  'ops.lead@xypes.local',
  'content.editor@xypes.local',
  'roxas.municipal.admin@xypes.local',
  'roxas.content.editor@xypes.local',
  'dispatcher@xypes.local',
  'roxas.dispatcher@xypes.local',
  'analyst@xypes.local',
  'responder@xypes.local',
  'roxas.responder@xypes.local',
  'auditor@xypes.local',
];

type CliOptions = {
  password: string | null;
  emails: string[];
  help: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  let password = process.env.SUPABASE_BACKFILL_PASSWORD?.trim() || null;
  let emails = DEFAULT_SEED_EMAILS;
  let help = false;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }

    if (arg.startsWith('--password=')) {
      password = arg.slice('--password='.length).trim() || null;
      continue;
    }

    if (arg.startsWith('--emails=')) {
      const rawEmails = arg.slice('--emails='.length);
      emails = rawEmails
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0);
    }
  }

  return { password, emails, help };
}

function printHelp() {
  console.log(`Backfill known local users into Supabase Auth and link their local records.

Usage:
  npm run supabase:backfill-seed -- --password=Password123!
  SUPABASE_BACKFILL_PASSWORD=Password123! npm run supabase:backfill-seed
  npm run supabase:backfill-seed -- --password=Password123! --emails=admin@xypes.local,dispatcher@xypes.local

Notes:
  - This does not recover existing hashed passwords. You must provide the plaintext password to assign in Supabase.
  - By default it targets the sample seed users from prisma/seed-data.sql.
  - Users that already have supabaseAuthUserId are skipped.
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.password) {
    throw new Error(
      'A password is required. Pass --password=... or set SUPABASE_BACKFILL_PASSWORD.',
    );
  }

  if (options.emails.length === 0) {
    throw new Error('At least one email must be provided with --emails=...');
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: options.emails,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      supabaseAuthUserId: true,
    },
    orderBy: {
      email: 'asc',
    },
  });

  const foundEmails = new Set(users.map((user) => user.email.toLowerCase()));
  const missingEmails = options.emails.filter((email) => !foundEmails.has(email));

  for (const email of missingEmails) {
    console.log(`MISSING_LOCAL_USER ${email}`);
  }

  let createdCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const user of users) {
    if (user.supabaseAuthUserId) {
      skippedCount += 1;
      console.log(`SKIP_LINKED ${user.email} ${user.supabaseAuthUserId}`);
      continue;
    }

    try {
      const supabaseUser = await registerSupabaseAuthUser({
        email: user.email,
        password: options.password,
        name: user.name,
        role: user.role,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          supabaseAuthUserId: supabaseUser.id,
        },
      });

      createdCount += 1;
      console.log(`LINKED ${user.email} ${supabaseUser.id}`);
    } catch (error) {
      failedCount += 1;

      if (error instanceof SupabaseAuthServiceError) {
        console.log(`FAILED ${user.email} ${error.code} ${error.message}`);
        continue;
      }

      if (error instanceof Error) {
        console.log(`FAILED ${user.email} ERROR ${error.message}`);
        continue;
      }

      console.log(`FAILED ${user.email} ERROR ${String(error)}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        requestedEmails: options.emails.length,
        foundUsers: users.length,
        missingLocalUsers: missingEmails.length,
        createdCount,
        skippedCount,
        failedCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
