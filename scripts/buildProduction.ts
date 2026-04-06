import { mkdirSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false, quiet: true });

const AUTH_PROVIDER_OPTIONS = ['local', 'supabase'] as const;
const TOKEN_MODE_OPTIONS = ['app-jwt', 'supabase-jwt'] as const;
const MFA_MODE_OPTIONS = ['disabled', 'local-totp', 'supabase-totp'] as const;
const MEDIA_STORAGE_OPTIONS = ['disabled', 'supabase-storage'] as const;
const RECORD_DELETION_OPTIONS = ['hard-delete', 'archive'] as const;

type FeatureSelectionCore = {
  authProvider: (typeof AUTH_PROVIDER_OPTIONS)[number];
  tokenMode: (typeof TOKEN_MODE_OPTIONS)[number];
  mfaMode: (typeof MFA_MODE_OPTIONS)[number];
  mediaStorage: (typeof MEDIA_STORAGE_OPTIONS)[number];
  recordDeletion: (typeof RECORD_DELETION_OPTIONS)[number];
};

function requireChoice<T extends readonly string[]>(envName: string, options: T): T[number] {
  const rawValue = process.env[envName]?.trim().toLowerCase();
  if (!rawValue) {
    throw new Error(`${envName} must be set. Allowed values: ${options.join(', ')}`);
  }

  if (!(options as readonly string[]).includes(rawValue)) {
    throw new Error(`${envName} must be one of: ${options.join(', ')}`);
  }

  return rawValue as T[number];
}

function validateSelection(selection: FeatureSelectionCore): void {
  if (selection.tokenMode === 'supabase-jwt' && selection.authProvider !== 'supabase') {
    throw new Error('FEATURE_TOKEN_MODE=supabase-jwt requires FEATURE_AUTH_PROVIDER=supabase');
  }

  if (selection.mfaMode === 'supabase-totp' && selection.tokenMode !== 'supabase-jwt') {
    throw new Error('FEATURE_MFA_MODE=supabase-totp requires FEATURE_TOKEN_MODE=supabase-jwt');
  }
}

function writeProductionFeatureProfile(selection: FeatureSelectionCore): void {
  const outputPath = path.resolve(process.cwd(), 'src/generated/productionFeatureProfile.ts');
  mkdirSync(path.dirname(outputPath), { recursive: true });

  const profileName = process.env.FEATURE_PROFILE_NAME?.trim() || 'production';
  const builtAt = new Date().toISOString();
  const content = `import type { LockedProductionFeatureProfile } from '../featureSelection.js';\n\nexport const productionFeatureProfile: LockedProductionFeatureProfile = {\n  locked: true,\n  profileName: ${JSON.stringify(profileName)},\n  builtAt: ${JSON.stringify(builtAt)},\n  selection: ${JSON.stringify(selection, null, 2)},\n};\n`;

  writeFileSync(outputPath, content, 'utf8');
}

function runBuild(): void {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(command, ['run', 'build'], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const selection: FeatureSelectionCore = {
  authProvider: requireChoice('FEATURE_AUTH_PROVIDER', AUTH_PROVIDER_OPTIONS),
  tokenMode: requireChoice('FEATURE_TOKEN_MODE', TOKEN_MODE_OPTIONS),
  mfaMode: requireChoice('FEATURE_MFA_MODE', MFA_MODE_OPTIONS),
  mediaStorage: requireChoice('FEATURE_MEDIA_STORAGE', MEDIA_STORAGE_OPTIONS),
  recordDeletion: requireChoice('FEATURE_RECORD_DELETION', RECORD_DELETION_OPTIONS),
};

validateSelection(selection);
writeProductionFeatureProfile(selection);
runBuild();
