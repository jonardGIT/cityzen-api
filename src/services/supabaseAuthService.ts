import jwt from 'jsonwebtoken';
import { AuthError, createClient, type Session } from '@supabase/supabase-js';
import {
  isSupabaseAuthFeatureEnabled,
  isSupabaseJwtFeatureEnabled,
  isSupabaseTotpFeatureEnabled,
} from '../featureSelection.js';

type SupabaseSignOutScope = 'global' | 'local' | 'others';
type SupabaseAuthenticatorAssuranceLevel = 'aal1' | 'aal2' | null;

type SupabaseAccessTokenClaims = {
  session_id?: string;
  iat?: number;
};

type SupabaseSessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export interface SupabaseSessionBundle {
  token: string;
  refreshToken: string | null;
  tokenType: string;
  sessionId: string | null;
  expiresAt: string | null;
  refreshExpiresAt: string | null;
  userId: string;
  email: string;
}

export interface SupabaseVerifiedAccessToken {
  id: string;
  email: string;
  sessionId: string | null;
  accessTokenIssuedAt: number | null;
  currentAuthenticatorLevel: SupabaseAuthenticatorAssuranceLevel;
  nextAuthenticatorLevel: SupabaseAuthenticatorAssuranceLevel;
  currentAuthenticationMethods: string[];
}

export interface SupabaseMfaAssuranceLevel {
  currentLevel: SupabaseAuthenticatorAssuranceLevel;
  nextLevel: SupabaseAuthenticatorAssuranceLevel;
  currentAuthenticationMethods: string[];
}

export interface SupabaseTotpFactor {
  id: string;
  factorType: string;
  friendlyName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupabaseTotpEnrollment {
  id: string;
  friendlyName: string | null;
  qrCode: string;
  secret: string;
  uri: string;
  issuer: string | null;
  status: string;
}

export class SupabaseAuthServiceError extends Error {
  code: string;
  status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'SupabaseAuthServiceError';
    this.code = code;
    this.status = status;
  }
}

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function getSupabaseUrl(): string {
  const value = process.env.SUPABASE_URL?.trim();
  if (!value) {
    throw new Error('SUPABASE_URL must be configured when SUPABASE_AUTH_ENABLED=true');
  }

  return value;
}

function getSupabaseAnonKey(): string {
  const value = process.env.SUPABASE_ANON_KEY?.trim();
  if (!value) {
    throw new Error('SUPABASE_ANON_KEY must be configured when SUPABASE_AUTH_ENABLED=true');
  }

  return value;
}

function getSupabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be configured when SUPABASE_AUTH_ENABLED=true');
  }

  return value;
}

function ensureSupabaseJwtConfiguration(): void {
  if (isSupabaseJwtEnabled() && !isSupabaseAuthEnabled()) {
    throw new Error('SUPABASE_AUTH_ENABLED must be true when SUPABASE_JWT_ENABLED=true');
  }
}

function ensureSupabaseTotpConfiguration(): void {
  if (isSupabaseTotpEnabled() && !isSupabaseJwtEnabled()) {
    throw new Error('SUPABASE_JWT_ENABLED must be true when SUPABASE_TOTP_ENABLED=true');
  }

  ensureSupabaseJwtConfiguration();
}

function createSupabaseClient(apiKey: string) {
  return createClient(getSupabaseUrl(), apiKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function getPublicClient() {
  return createSupabaseClient(getSupabaseAnonKey());
}

function getAdminClient() {
  return createSupabaseClient(getSupabaseServiceRoleKey());
}

async function createSessionScopedClient(tokens: SupabaseSessionTokens) {
  const client = getPublicClient();
  const { data, error } = await client.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  if (error) {
    throw mapAuthApiError(error);
  }

  if (!data.session) {
    throw new SupabaseAuthServiceError(
      'SUPABASE_AUTH_ERROR',
      'Supabase session could not be established for MFA operations',
    );
  }

  return client;
}

function getPasswordResetRedirectUrl(): string | undefined {
  const value = process.env.SUPABASE_PASSWORD_RESET_REDIRECT_URL?.trim();
  return value ? value : undefined;
}

function decodeSupabaseAccessToken(token: string): SupabaseAccessTokenClaims {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== 'object') {
    return {};
  }

  const payload = decoded as Record<string, unknown>;
  return {
    session_id: typeof payload.session_id === 'string' ? payload.session_id : undefined,
    iat: typeof payload.iat === 'number' ? payload.iat : undefined,
  };
}

function buildSupabaseSessionBundle(session: Session): SupabaseSessionBundle {
  if (!session.access_token || !session.user?.id || !session.user.email) {
    throw new SupabaseAuthServiceError(
      'SUPABASE_AUTH_ERROR',
      'Supabase session is missing required token or user data',
    );
  }

  const claims = decodeSupabaseAccessToken(session.access_token);

  return {
    token: session.access_token,
    refreshToken: session.refresh_token ?? null,
    tokenType: session.token_type ? session.token_type.replace(/^bearer$/i, 'Bearer') : 'Bearer',
    sessionId: claims.session_id ?? null,
    expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    refreshExpiresAt: null,
    userId: session.user.id,
    email: session.user.email,
  };
}

function buildSupabaseSessionBundleFromAuthResponse(payload: {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: {
    id?: string;
    email?: string;
  } | null;
}): SupabaseSessionBundle {
  if (!payload.access_token || !payload.user?.id || !payload.user.email) {
    throw new SupabaseAuthServiceError(
      'SUPABASE_AUTH_ERROR',
      'Supabase MFA response is missing required token or user data',
    );
  }

  const claims = decodeSupabaseAccessToken(payload.access_token);
  const expiresAt =
    typeof payload.expires_in === 'number'
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : null;

  return {
    token: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    tokenType: payload.token_type ? payload.token_type.replace(/^bearer$/i, 'Bearer') : 'Bearer',
    sessionId: claims.session_id ?? null,
    expiresAt,
    refreshExpiresAt: null,
    userId: payload.user.id,
    email: payload.user.email,
  };
}

function normalizeAuthenticatorLevel(value: unknown): SupabaseAuthenticatorAssuranceLevel {
  if (value === 'aal1' || value === 'aal2') {
    return value;
  }

  return null;
}

function mapSupabaseFactor(factor: Record<string, unknown>): SupabaseTotpFactor {
  return {
    id: String(factor.id),
    factorType: String(factor.factor_type ?? ''),
    friendlyName: typeof factor.friendly_name === 'string' ? factor.friendly_name : null,
    status: String(factor.status ?? ''),
    createdAt: typeof factor.created_at === 'string' ? factor.created_at : '',
    updatedAt: typeof factor.updated_at === 'string' ? factor.updated_at : '',
  };
}

function shouldAutoConfirmEmail(): boolean {
  const rawValue = process.env.SUPABASE_AUTH_AUTO_CONFIRM_EMAIL?.trim();
  if (!rawValue) {
    return true;
  }

  return isTrue(rawValue);
}

function mapAuthApiError(error: AuthError): SupabaseAuthServiceError {
  const message = error.message.toLowerCase();
  const status = error.status ?? 500;
  const code = (error as AuthError & { code?: string }).code;

  if (status === 422 && message.includes('already registered')) {
    return new SupabaseAuthServiceError('EMAIL_CONFLICT', 'Email already registered', 409);
  }

  if (status === 400 && message.includes('email not confirmed')) {
    return new SupabaseAuthServiceError(
      'EMAIL_NOT_CONFIRMED',
      'Email confirmation is required before signing in',
      401,
    );
  }

  if (status === 400 && message.includes('invalid login credentials')) {
    return new SupabaseAuthServiceError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  if (code === 'mfa_totp_enroll_not_enabled' || code === 'mfa_totp_verify_not_enabled') {
    return new SupabaseAuthServiceError(
      'SUPABASE_TOTP_NOT_ENABLED',
      'Supabase TOTP MFA is not enabled for this project',
      503,
    );
  }

  if (status === 400 && (message.includes('invalid otp') || message.includes('invalid code'))) {
    return new SupabaseAuthServiceError('INVALID_MFA_CODE', 'Invalid MFA code', 401);
  }

  return new SupabaseAuthServiceError('SUPABASE_AUTH_ERROR', error.message, status);
}

export function isSupabaseAuthEnabled(): boolean {
  return isSupabaseAuthFeatureEnabled();
}

export function isSupabaseJwtEnabled(): boolean {
  return isSupabaseJwtFeatureEnabled();
}

export function isSupabaseTotpEnabled(): boolean {
  return isSupabaseTotpFeatureEnabled();
}

export async function registerSupabaseAuthUser(input: {
  email: string;
  password: string;
  displayName?: string;
  role: string;
}): Promise<{ id: string; email: string }> {
  const client = getAdminClient();
  const userMetadata: Record<string, string> = {
    role: input.role,
  };

  if (input.displayName) {
    userMetadata.name = input.displayName;
  }

  const { data, error } = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: shouldAutoConfirmEmail(),
    user_metadata: userMetadata,
  });

  if (error) {
    throw mapAuthApiError(error);
  }

  if (!data.user?.id || !data.user.email) {
    throw new SupabaseAuthServiceError('SUPABASE_AUTH_ERROR', 'Supabase user creation failed');
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
}

export async function authenticateSupabaseUser(input: {
  email: string;
  password: string;
}): Promise<{ id: string; email: string }> {
  const client = getPublicClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw mapAuthApiError(error);
  }

  if (!data.user?.id || !data.user.email) {
    throw new SupabaseAuthServiceError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
}

export async function signInSupabaseUser(input: {
  email: string;
  password: string;
}): Promise<SupabaseSessionBundle> {
  ensureSupabaseJwtConfiguration();

  const client = getPublicClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw mapAuthApiError(error);
  }

  if (!data.session) {
    throw new SupabaseAuthServiceError(
      'SUPABASE_AUTH_ERROR',
      'Supabase sign-in did not return a session',
    );
  }

  return buildSupabaseSessionBundle(data.session);
}

export async function refreshSupabaseSession(refreshToken: string): Promise<SupabaseSessionBundle> {
  ensureSupabaseJwtConfiguration();

  const client = getPublicClient();
  const { data, error } = await client.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) {
    throw mapAuthApiError(error);
  }

  if (!data.session) {
    throw new SupabaseAuthServiceError(
      'SUPABASE_AUTH_ERROR',
      'Supabase refresh did not return a session',
    );
  }

  return buildSupabaseSessionBundle(data.session);
}

export async function verifySupabaseAccessToken(
  accessToken: string,
): Promise<SupabaseVerifiedAccessToken> {
  ensureSupabaseJwtConfiguration();

  const client = getPublicClient();
  const { data, error } = await client.auth.getUser(accessToken);

  if (error) {
    throw mapAuthApiError(error);
  }

  if (!data.user?.id || !data.user.email) {
    throw new SupabaseAuthServiceError(
      'INVALID_CREDENTIALS',
      'Invalid or expired Supabase access token',
      401,
    );
  }

  const claims = decodeSupabaseAccessToken(accessToken);
  const assurance = await getSupabaseMfaAssuranceLevel(accessToken).catch(() => ({
    currentLevel: null,
    nextLevel: null,
    currentAuthenticationMethods: [],
  }));

  return {
    id: data.user.id,
    email: data.user.email,
    sessionId: claims.session_id ?? null,
    accessTokenIssuedAt: claims.iat ?? null,
    currentAuthenticatorLevel: assurance.currentLevel,
    nextAuthenticatorLevel: assurance.nextLevel,
    currentAuthenticationMethods: assurance.currentAuthenticationMethods,
  };
}

export async function getSupabaseMfaAssuranceLevel(
  accessToken: string,
): Promise<SupabaseMfaAssuranceLevel> {
  ensureSupabaseJwtConfiguration();

  const client = getPublicClient();
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel(accessToken);

  if (error) {
    throw mapAuthApiError(error);
  }

  return {
    currentLevel: normalizeAuthenticatorLevel(data.currentLevel),
    nextLevel: normalizeAuthenticatorLevel(data.nextLevel),
    currentAuthenticationMethods: Array.isArray(data.currentAuthenticationMethods)
      ? data.currentAuthenticationMethods.map((method) => String(method))
      : [],
  };
}

export async function listSupabaseMfaFactors(tokens: SupabaseSessionTokens): Promise<{
  all: SupabaseTotpFactor[];
  totp: SupabaseTotpFactor[];
}> {
  ensureSupabaseTotpConfiguration();

  const client = await createSessionScopedClient(tokens);
  const { data, error } = await client.auth.mfa.listFactors();

  if (error) {
    throw mapAuthApiError(error);
  }

  return {
    all: Array.isArray(data.all) ? data.all.map((factor) => mapSupabaseFactor(factor)) : [],
    totp: Array.isArray(data.totp) ? data.totp.map((factor) => mapSupabaseFactor(factor)) : [],
  };
}

export async function enrollSupabaseTotpFactor(input: {
  accessToken: string;
  refreshToken: string;
  friendlyName?: string;
  issuer?: string;
}): Promise<SupabaseTotpEnrollment> {
  ensureSupabaseTotpConfiguration();

  const client = await createSessionScopedClient({
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
  });

  const { data, error } = await client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: input.friendlyName,
    issuer: input.issuer,
  });

  if (error) {
    throw mapAuthApiError(error);
  }

  if (data.type !== 'totp' || !data.totp?.qr_code || !data.totp.secret || !data.totp.uri) {
    throw new SupabaseAuthServiceError(
      'SUPABASE_AUTH_ERROR',
      'Supabase TOTP enrollment did not return setup details',
    );
  }

  return {
    id: data.id,
    friendlyName: data.friendly_name ?? null,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
    issuer: input.issuer ?? null,
    status: 'unverified',
  };
}

export async function challengeAndVerifySupabaseTotpFactor(input: {
  accessToken: string;
  refreshToken: string;
  factorId: string;
  code: string;
}): Promise<SupabaseSessionBundle> {
  ensureSupabaseTotpConfiguration();

  const client = await createSessionScopedClient({
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
  });

  const { data, error } = await client.auth.mfa.challengeAndVerify({
    factorId: input.factorId,
    code: input.code,
  });

  if (error) {
    throw mapAuthApiError(error);
  }

  return buildSupabaseSessionBundleFromAuthResponse(data);
}

export async function listSupabaseAdminMfaFactors(
  authUserId: string,
): Promise<SupabaseTotpFactor[]> {
  const client = getAdminClient();
  const { data, error } = await client.auth.admin.mfa.listFactors({ userId: authUserId });

  if (error) {
    throw mapAuthApiError(error);
  }

  return Array.isArray(data.factors) ? data.factors.map((factor) => mapSupabaseFactor(factor)) : [];
}

export async function deleteSupabaseAdminMfaFactor(
  authUserId: string,
  factorId: string,
): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.auth.admin.mfa.deleteFactor({ userId: authUserId, id: factorId });

  if (error) {
    throw mapAuthApiError(error);
  }
}

export async function revokeSupabaseAccessToken(
  accessToken: string,
  scope: SupabaseSignOutScope = 'local',
): Promise<void> {
  ensureSupabaseJwtConfiguration();

  const client = getAdminClient();
  const { error } = await client.auth.admin.signOut(accessToken, scope);

  if (error) {
    throw mapAuthApiError(error);
  }
}

export async function updateSupabaseAuthUser(
  authUserId: string,
  input: {
    email?: string;
    password?: string;
    displayName?: string;
    role?: string;
  },
): Promise<void> {
  const client = getAdminClient();
  const userMetadata: Record<string, string> = {};

  if (input.displayName !== undefined) {
    userMetadata.name = input.displayName;
  }

  if (input.role !== undefined) {
    userMetadata.role = input.role;
  }

  const { error } = await client.auth.admin.updateUserById(authUserId, {
    email: input.email,
    password: input.password,
    user_metadata: Object.keys(userMetadata).length > 0 ? userMetadata : undefined,
  });

  if (error) {
    throw mapAuthApiError(error);
  }
}

export async function deleteSupabaseAuthUser(authUserId: string): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.auth.admin.deleteUser(authUserId);

  if (error) {
    throw mapAuthApiError(error);
  }
}

export async function sendSupabasePasswordResetEmail(email: string): Promise<void> {
  const client = getPublicClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectUrl(),
  });

  if (error) {
    throw mapAuthApiError(error);
  }
}
