import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import dotenv from 'dotenv';
import { build } from 'esbuild';

function applyMissingEnv(values: Record<string, string | undefined> | undefined): void {
  if (!values) {
    return;
  }

  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined && value !== undefined) {
      process.env[key] = value;
    }
  }
}

function loadPm2Environment(): boolean {
  const ecosystemPath = path.resolve(process.cwd(), 'ecosystem.config.cjs');

  if (!existsSync(ecosystemPath)) {
    return false;
  }

  const require = createRequire(import.meta.url);
  const ecosystem = require(ecosystemPath);
  const appName = process.env.PM2_APP_NAME?.trim() || 'xypes-cirs-api';
  const apps = Array.isArray(ecosystem?.apps) ? ecosystem.apps : [];
  const app = apps.find((entry: { name?: string }) => entry?.name === appName) ?? apps[0];

  if (!app) {
    throw new Error(`No PM2 app configuration found in ecosystem.config.cjs`);
  }

  applyMissingEnv(app.env);
  applyMissingEnv(app.env_production);
  return true;
}

if (!loadPm2Environment()) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false, quiet: true });
}

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
  const content = `import type { LockedProductionFeatureProfile } from '../featureSelection.js';\n\nexport const productionFeatureProfile: LockedProductionFeatureProfile = {\n  locked: true,\n  profileName: ${JSON.stringify(profileName)},\n  builtAt: null,\n  selection: ${JSON.stringify(selection, null, 2)},\n};\n`;

  writeFileSync(outputPath, content, 'utf8');
}

async function runBuild(selection: FeatureSelectionCore): Promise<void> {
  const distDir = path.resolve(process.cwd(), 'dist');
  rmSync(distDir, { recursive: true, force: true });

  await build({
    entryPoints: [path.resolve(process.cwd(), 'src/server.ts')],
    outfile: path.resolve(distDir, 'server.js'),
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    packages: 'external',
    treeShaking: true,
    minify: true,
    sourcemap: false,
    legalComments: 'none',
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.CIRS_BUNDLE_FEATURE_LOCKED': '"true"',
      'process.env.CIRS_BUNDLE_FEATURE_PROFILE_NAME': JSON.stringify(
        process.env.FEATURE_PROFILE_NAME?.trim() || 'production',
      ),
      'process.env.CIRS_BUNDLE_FEATURE_AUTH_PROVIDER': JSON.stringify(selection.authProvider),
      'process.env.CIRS_BUNDLE_FEATURE_TOKEN_MODE': JSON.stringify(selection.tokenMode),
      'process.env.CIRS_BUNDLE_FEATURE_MFA_MODE': JSON.stringify(selection.mfaMode),
      'process.env.CIRS_BUNDLE_FEATURE_MEDIA_STORAGE': JSON.stringify(selection.mediaStorage),
      'process.env.CIRS_BUNDLE_FEATURE_RECORD_DELETION': JSON.stringify(selection.recordDeletion),
    },
  });
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
await runBuild(selection);
