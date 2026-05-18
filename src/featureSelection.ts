import { productionFeatureProfile } from './generated/productionFeatureProfile.js';

export type AuthProviderSelection = 'local' | 'supabase';
export type TokenModeSelection = 'app-jwt' | 'supabase-jwt';
export type MfaModeSelection = 'disabled' | 'local-totp' | 'supabase-totp';
export type MediaStorageSelection = 'disabled' | 'supabase-storage';
export type RecordDeletionSelection = 'hard-delete' | 'archive';

export interface FeatureSelectionCore {
  authProvider: AuthProviderSelection;
  tokenMode: TokenModeSelection;
  mfaMode: MfaModeSelection;
  mediaStorage: MediaStorageSelection;
  recordDeletion: RecordDeletionSelection;
}

export interface FeatureSelection extends FeatureSelectionCore {
  profileSource: 'runtime-env' | 'production-build';
  profileName: string;
}

export interface LockedProductionFeatureProfile {
  locked: boolean;
  profileName: string;
  builtAt: string | null;
  selection: FeatureSelectionCore | null;
}

const AUTH_PROVIDER_OPTIONS = ['local', 'supabase'] as const;
const TOKEN_MODE_OPTIONS = ['app-jwt', 'supabase-jwt'] as const;
const MFA_MODE_OPTIONS = ['disabled', 'local-totp', 'supabase-totp'] as const;
const MEDIA_STORAGE_OPTIONS = ['disabled', 'supabase-storage'] as const;
const RECORD_DELETION_OPTIONS = ['hard-delete', 'archive'] as const;

let cachedFeatureSelection: FeatureSelection | null = null;

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function parseChoice<T extends readonly string[]>(
  value: string | undefined,
  options: T,
): T[number] | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return (options as readonly string[]).includes(normalized) ? (normalized as T[number]) : null;
}

function validateFeatureSelectionCore(selection: FeatureSelectionCore): void {
  if (selection.tokenMode === 'supabase-jwt' && selection.authProvider !== 'supabase') {
    throw new Error('tokenMode=supabase-jwt requires authProvider=supabase');
  }

  if (selection.mfaMode === 'supabase-totp' && selection.tokenMode !== 'supabase-jwt') {
    throw new Error('mfaMode=supabase-totp requires tokenMode=supabase-jwt');
  }
}

const bundledAuthProvider = parseChoice(
  process.env.CIRS_BUNDLE_FEATURE_AUTH_PROVIDER,
  AUTH_PROVIDER_OPTIONS,
);
const bundledTokenMode = parseChoice(
  process.env.CIRS_BUNDLE_FEATURE_TOKEN_MODE,
  TOKEN_MODE_OPTIONS,
);
const bundledMfaMode = parseChoice(process.env.CIRS_BUNDLE_FEATURE_MFA_MODE, MFA_MODE_OPTIONS);
const bundledMediaStorage = parseChoice(
  process.env.CIRS_BUNDLE_FEATURE_MEDIA_STORAGE,
  MEDIA_STORAGE_OPTIONS,
);
const bundledRecordDeletion = parseChoice(
  process.env.CIRS_BUNDLE_FEATURE_RECORD_DELETION,
  RECORD_DELETION_OPTIONS,
);

const bundledFeatureSelectionCore: FeatureSelectionCore | null =
  process.env.CIRS_BUNDLE_FEATURE_LOCKED === 'true' &&
  bundledAuthProvider &&
  bundledTokenMode &&
  bundledMfaMode &&
  bundledMediaStorage &&
  bundledRecordDeletion
    ? {
        authProvider: bundledAuthProvider,
        tokenMode: bundledTokenMode,
        mfaMode: bundledMfaMode,
        mediaStorage: bundledMediaStorage,
        recordDeletion: bundledRecordDeletion,
      }
    : null;

if (bundledFeatureSelectionCore) {
  validateFeatureSelectionCore(bundledFeatureSelectionCore);
}

export const BUILD_TIME_SESSION_INVENTORY_FEATURE_ENABLED: boolean | null =
  bundledFeatureSelectionCore ? bundledFeatureSelectionCore.tokenMode === 'app-jwt' : null;

export const BUILD_TIME_ANY_MFA_FEATURE_ENABLED: boolean | null = bundledFeatureSelectionCore
  ? bundledFeatureSelectionCore.mfaMode !== 'disabled'
  : null;

export const BUILD_TIME_INCIDENT_MEDIA_UPLOAD_FEATURE_ENABLED: boolean | null =
  bundledFeatureSelectionCore
    ? bundledFeatureSelectionCore.mediaStorage === 'supabase-storage'
    : null;

function buildRuntimeFeatureSelection(): FeatureSelection {
  const rawArchiveFlag = process.env.ARCHIVE_RECORDS_ENABLED;
  const authProvider =
    parseChoice(process.env.FEATURE_AUTH_PROVIDER, AUTH_PROVIDER_OPTIONS) ??
    (isTrue(process.env.SUPABASE_AUTH_ENABLED) ? 'supabase' : 'local');
  const tokenMode =
    parseChoice(process.env.FEATURE_TOKEN_MODE, TOKEN_MODE_OPTIONS) ??
    (isTrue(process.env.SUPABASE_JWT_ENABLED) ? 'supabase-jwt' : 'app-jwt');
  const mfaMode =
    parseChoice(process.env.FEATURE_MFA_MODE, MFA_MODE_OPTIONS) ??
    (isTrue(process.env.SUPABASE_TOTP_ENABLED) ? 'supabase-totp' : 'local-totp');
  const mediaStorage =
    parseChoice(process.env.FEATURE_MEDIA_STORAGE, MEDIA_STORAGE_OPTIONS) ??
    (isTrue(process.env.SUPABASE_STORAGE_ENABLED) ? 'supabase-storage' : 'disabled');
  const recordDeletion =
    parseChoice(process.env.FEATURE_RECORD_DELETION, RECORD_DELETION_OPTIONS) ??
    (rawArchiveFlag === undefined || rawArchiveFlag.trim() === '' || isTrue(rawArchiveFlag)
      ? 'archive'
      : 'hard-delete');

  const selection: FeatureSelection = {
    profileSource: 'runtime-env',
    profileName: process.env.FEATURE_PROFILE_NAME?.trim() || 'runtime-env',
    authProvider,
    tokenMode,
    mfaMode,
    mediaStorage,
    recordDeletion,
  };

  validateFeatureSelectionCore(selection);
  return selection;
}

export function getFeatureSelection(): FeatureSelection {
  if (cachedFeatureSelection) {
    return cachedFeatureSelection;
  }

  if (bundledFeatureSelectionCore) {
    cachedFeatureSelection = {
      profileSource: 'production-build',
      profileName: process.env.CIRS_BUNDLE_FEATURE_PROFILE_NAME?.trim() || 'production',
      ...bundledFeatureSelectionCore,
    };
    return cachedFeatureSelection;
  }

  if (process.env.NODE_ENV === 'production' && productionFeatureProfile.locked) {
    if (!productionFeatureProfile.selection) {
      throw new Error('production feature profile is locked but missing selection data');
    }

    validateFeatureSelectionCore(productionFeatureProfile.selection);
    cachedFeatureSelection = {
      profileSource: 'production-build',
      profileName: productionFeatureProfile.profileName,
      ...productionFeatureProfile.selection,
    };
    return cachedFeatureSelection;
  }

  cachedFeatureSelection = buildRuntimeFeatureSelection();
  return cachedFeatureSelection;
}

export function resetFeatureSelectionCache(): void {
  cachedFeatureSelection = null;
}

export function getFeatureSelectionForTests(env: NodeJS.ProcessEnv): FeatureSelection {
  const previousEnv = process.env;
  const previousCache = cachedFeatureSelection;

  try {
    process.env = env;
    cachedFeatureSelection = null;
    return buildRuntimeFeatureSelection();
  } finally {
    process.env = previousEnv;
    cachedFeatureSelection = previousCache;
  }
}

export function isSupabaseAuthFeatureEnabled(): boolean {
  return getFeatureSelection().authProvider === 'supabase';
}

export function isSupabaseJwtFeatureEnabled(): boolean {
  return getFeatureSelection().tokenMode === 'supabase-jwt';
}

export function isSessionInventoryFeatureEnabled(): boolean {
  return ['app-jwt', 'supabase-jwt'].includes(getFeatureSelection().tokenMode);
}

export function isSupabaseTotpFeatureEnabled(): boolean {
  return getFeatureSelection().mfaMode === 'supabase-totp';
}

export function isLocalTotpFeatureEnabled(): boolean {
  return getFeatureSelection().mfaMode === 'local-totp';
}

export function isAnyMfaFeatureEnabled(): boolean {
  return getFeatureSelection().mfaMode !== 'disabled';
}

export function isIncidentMediaUploadFeatureEnabled(): boolean {
  return getFeatureSelection().mediaStorage === 'supabase-storage';
}

export function isArchiveFeatureEnabled(): boolean {
  return getFeatureSelection().recordDeletion === 'archive';
}
