import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { MFA_REQUIRED_ROLES, normalizeUserRoleInput, type UserRole } from '../types/auth.js';
import {
  createAuthSession,
  listAuthSessionsForUser,
  refreshAuthSession,
  revokeAllUserSessions,
  revokeAuthSession,
  revokeUserSession,
} from '../services/authSessionService.js';
import { createMfaSetup, verifyMfaCode } from '../utils/mfa.js';
import { isAnyMfaFeatureEnabled, isLocalTotpFeatureEnabled } from '../featureSelection.js';
import {
  requestPasswordReset as createPasswordResetRequest,
  isPrivilegedPasswordRecoveryBlocked,
  resetPasswordWithToken as consumePasswordResetToken,
} from '../services/passwordResetService.js';
import {
  sendPasswordResetMessage,
  isPasswordResetDeliveryConfigured,
  shouldIncludePasswordResetTokenInResponse,
} from '../services/passwordResetDeliveryService.js';
import {
  authenticateSupabaseUser,
  challengeAndVerifySupabaseTotpFactor,
  deleteSupabaseAuthUser,
  deleteSupabaseAdminMfaFactor,
  enrollSupabaseTotpFactor,
  getSupabaseMfaAssuranceLevel,
  isSupabaseTotpEnabled,
  isSupabaseAuthEnabled,
  isSupabaseJwtEnabled,
  listSupabaseAdminMfaFactors,
  listSupabaseMfaFactors,
  refreshSupabaseSession,
  revokeSupabaseAccessToken,
  registerSupabaseAuthUser,
  signInSupabaseUser,
  SupabaseAuthServiceError,
  updateSupabaseAuthUser,
} from '../services/supabaseAuthService.js';
import { isArchiveEnabled, withActiveRecords } from '../utils/archive.js';
import { buildCitizenMobileSurrogateEmail, normalizeMobileNumber } from '../utils/mobileAuth.js';
import {
  isPrivilegedMfaFeatureMisconfigured,
  requiresPrivilegedMfaEnrollment,
} from '../utils/mfaPolicy.js';
import {
  PrivacyNoticeAcceptanceError,
  resolvePrivacyNoticeAcceptance,
} from '../utils/privacyNotice.js';
import {
  buildCanonicalNameCreateData,
  resolveStoredDisplayName,
} from '../utils/nameFields.js';

const MOBILE_AUTH_ROLE_ONLY_MESSAGE = 'Mobile auth is only available for citizen accounts';
const MOBILE_AUTH_PROVIDER_BOUNDARY_MESSAGE =
  'Mobile auth is only available when local app auth and app JWT sessions are enabled';

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

async function buildSupabaseManagedPasswordHash(): Promise<string> {
  return bcrypt.hash(`supabase-managed:${randomUUID()}`, 10);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getRequestBodyObject(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return {};
  }

  return req.body as Record<string, unknown>;
}

function requiresSupabaseTotpForUser(role: UserRole, mfaEnabled: boolean): boolean {
  return (
    isSupabaseJwtEnabled() &&
    isSupabaseTotpEnabled() &&
    MFA_REQUIRED_ROLES.includes(role) &&
    mfaEnabled
  );
}

function getSupabaseSessionTokensFromRequest(req: Request): {
  accessToken: string;
  refreshToken: string;
} | null {
  const accessToken = (req as AuthenticatedRequest).authAccessToken;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { refreshToken } = body as { refreshToken?: string };

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
}

function isInvalidSupabaseMfaCodeError(error: unknown): boolean {
  return error instanceof SupabaseAuthServiceError && error.code === 'INVALID_MFA_CODE';
}

function getAuthUserSelect() {
  return {
    id: true,
    createdAt: true,
    updatedAt: true,
    name: true,
    firstName: true,
    middleName: true,
    lastName: true,
    suffix: true,
    email: true,
    mobileNumber: true,
    mobileNumberVerifiedAt: true,
    citizenId: true,
    role: true,
    mfaEnabled: true,
    mfaEnabledAt: true,
  } as const;
}

function buildAuthUserPayload(user: {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  suffix: string | null;
  email: string;
  mobileNumber: string | null;
  mobileNumberVerifiedAt: Date | null;
  citizenId: string | null;
  role: string;
  mfaEnabled: boolean;
  mfaEnabledAt: Date | null;
}) {
  return {
    id: user.id,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    name: resolveStoredDisplayName(user),
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    suffix: user.suffix,
    email: user.email,
    mobileNumber: user.mobileNumber,
    mobileNumberVerifiedAt: user.mobileNumberVerifiedAt,
    citizenId: user.citizenId,
    role: normalizeUserRoleInput(user.role) ?? 'CITIZEN_REPORTER',
    mfaEnabled: user.mfaEnabled,
    mfaEnabledAt: user.mfaEnabledAt,
  };
}

function buildLocalJwtResponse(
  session: {
    token: string;
    refreshToken: string;
    sessionId: string;
    expiresAt: string;
    refreshExpiresAt: string;
  },
  user: ReturnType<typeof buildAuthUserPayload>,
) {
  return {
    token: session.token,
    accessToken: session.token,
    refreshToken: session.refreshToken,
    tokenType: 'Bearer',
    sessionId: session.sessionId,
    expiresAt: session.expiresAt,
    refreshExpiresAt: session.refreshExpiresAt,
    user,
  };
}

function isMfaConfigurationError(error: unknown): boolean {
  return (
    error instanceof Error && error.message === 'MFA_ENCRYPTION_KEY must be configured to use MFA'
  );
}

function isMfaStorageError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022')
  );
}

function isMfaDataError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === 'Invalid MFA secret payload' ||
      error.message === 'Invalid base32 MFA secret' ||
      error.message.includes('Unsupported state or unable to authenticate data'))
  );
}

function handleMfaRuntimeError(res: Response, error: unknown): boolean {
  if (isMfaConfigurationError(error)) {
    res.status(503).json({
      message: 'MFA is not available: MFA_ENCRYPTION_KEY must be configured on the server',
    });
    return true;
  }

  if (isMfaStorageError(error)) {
    res.status(503).json({
      message:
        'MFA storage is not available: apply prisma/add-user-mfa.sql to the live database and redeploy the backend',
    });
    return true;
  }

  if (isMfaDataError(error)) {
    res.status(500).json({
      message: 'MFA data is invalid for this account. Reset MFA setup and try again.',
    });
    return true;
  }

  return false;
}

function isPasswordResetStorageError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022')
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function handleSupabaseAuthRuntimeError(res: Response, error: unknown): boolean {
  if (error instanceof SupabaseAuthServiceError) {
    res.status(error.status ?? 503).json({ message: error.message });
    return true;
  }

  if (
    error instanceof Error &&
    (error.message.includes('SUPABASE_URL must be configured') ||
      error.message.includes('SUPABASE_ANON_KEY must be configured') ||
      error.message.includes('SUPABASE_SERVICE_ROLE_KEY must be configured') ||
      error.message.includes('SUPABASE_AUTH_ENABLED must be true when SUPABASE_JWT_ENABLED=true') ||
      error.message.includes('SUPABASE_JWT_ENABLED must be true when SUPABASE_TOTP_ENABLED=true'))
  ) {
    res.status(503).json({
      message: `Supabase Auth is not available: ${error.message}`,
    });
    return true;
  }

  return false;
}

function buildSupabaseJwtResponse(
  session: {
    token: string;
    refreshToken: string | null;
    tokenType: string;
    sessionId: string | null;
    expiresAt: string | null;
    refreshExpiresAt: string | null;
  },
  user: Record<string, unknown>,
) {
  return {
    token: session.token,
    accessToken: session.token,
    refreshToken: session.refreshToken,
    tokenType: session.tokenType,
    sessionId: session.sessionId,
    expiresAt: session.expiresAt,
    refreshExpiresAt: session.refreshExpiresAt,
    user,
  };
}

function applyPrivilegedMfaEnrollmentFlags<T extends Record<string, unknown>>(
  role: UserRole,
  mfaEnabled: boolean,
  body: T,
): T & { mfaEnrollmentRequired?: boolean } {
  if (!requiresPrivilegedMfaEnrollment(role, mfaEnabled)) {
    return body;
  }

  return {
    ...body,
    mfaEnrollmentRequired: true,
  };
}

async function revokeSupabaseTokenQuietly(token: string | null | undefined): Promise<void> {
  if (!token) {
    return;
  }

  await revokeSupabaseAccessToken(token, 'local').catch(() => undefined);
}

async function getLocalAuthUserForSupabaseIdentity(supabaseUserId: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findFirst({
    where: withActiveRecords({
      OR: [{ supabaseAuthUserId: supabaseUserId }, { email: normalizedEmail }],
    }),
    select: {
      ...getAuthUserSelect(),
      supabaseAuthUserId: true,
    },
  });

  if (!user) {
    return null;
  }

  if (user.supabaseAuthUserId && user.supabaseAuthUserId !== supabaseUserId) {
    throw new SupabaseAuthServiceError(
      'USER_LINK_CONFLICT',
      'This email is linked to a different Supabase Auth account',
      409,
    );
  }

  if (!user.supabaseAuthUserId) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        supabaseAuthUserId: supabaseUserId,
      },
    });
    user.supabaseAuthUserId = supabaseUserId;
  }

  const { supabaseAuthUserId: _supabaseAuthUserId, ...authUser } = user;
  return authUser;
}

function isCitizenReporterAccount(role: string): boolean {
  return normalizeUserRoleInput(role) === 'CITIZEN_REPORTER';
}

function isMobileAuthProviderBoundaryViolated(): boolean {
  return isSupabaseAuthEnabled() || isSupabaseJwtEnabled();
}

function handlePasswordResetRuntimeError(res: Response, error: unknown): boolean {
  if (
    error instanceof Error &&
    (error.message.includes('PASSWORD_RESET_DELIVERY_WEBHOOK_URL must be configured') ||
      error.message.includes('Password reset delivery webhook returned HTTP'))
  ) {
    res.locals.auditMetadata = {
      resetTokenIssued: false,
      privilegedRecoveryBlocked: false,
      deliveryMode: 'failed',
      deliveryAccepted: false,
      deliveryFailure: true,
    };
    res.status(503).json({
      message: `Password reset delivery is not available: ${error.message}`,
    });
    return true;
  }

  if (isPasswordResetStorageError(error)) {
    res.status(503).json({
      message:
        'Password reset storage is not available: apply prisma/add-password-reset-tokens.sql to the live database and redeploy the backend',
    });
    return true;
  }

  return false;
}

// Registers a new user (public endpoint for self-registration).
export async function register(req: Request, res: Response): Promise<void> {
  const requestBody = getRequestBodyObject(req);
  const { email, password } = requestBody as {
    email?: unknown;
    password?: unknown;
  };
  const nameData = buildCanonicalNameCreateData(requestBody);

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !nameData ||
    !email ||
    !password
  ) {
    res.status(422).json({ message: 'name or firstName and lastName, email, and password are required' });
    return;
  }

  const canonicalNameData = nameData;
  const canonicalDisplayName = nameData.name;

  const normalizedEmail = normalizeEmail(email);

  if (!isStrongPassword(password)) {
    res.status(422).json({
      message:
        'password must be at least 12 characters and include uppercase, lowercase, number, and special character',
    });
    return;
  }

  let privacyNoticeAcceptance;

  try {
    privacyNoticeAcceptance = resolvePrivacyNoticeAcceptance(requestBody);
  } catch (error) {
    if (error instanceof PrivacyNoticeAcceptanceError) {
      res.status(422).json({ message: error.message });
      return;
    }

    throw error;
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    res.status(409).json({ message: 'Email already registered' });
    return;
  }

  let passwordHash: string | null = null;
  let supabaseAuthUserId: string | null = null;

  if (isSupabaseAuthEnabled()) {
    try {
      const supabaseUser = await registerSupabaseAuthUser({
        email: normalizedEmail,
        password,
        displayName: canonicalDisplayName,
        role: 'CITIZEN_REPORTER',
      });
      supabaseAuthUserId = supabaseUser.id;
    } catch (error) {
      if (handleSupabaseAuthRuntimeError(res, error)) {
        return;
      }

      throw error;
    }
  } else {
    passwordHash = await bcrypt.hash(password, 10);
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: canonicalDisplayName,
        firstName: canonicalNameData.firstName,
        middleName: canonicalNameData.middleName,
        lastName: canonicalNameData.lastName,
        suffix: canonicalNameData.suffix,
        email: normalizedEmail,
        passwordHash,
        supabaseAuthUserId,
        role: 'CITIZEN_REPORTER',
        privacyNoticeAcceptedAt: privacyNoticeAcceptance?.acceptedAt ?? null,
        privacyNoticeVersion: privacyNoticeAcceptance?.version ?? null,
      },
      select: {
        ...getAuthUserSelect(),
      },
    });

    if (isSupabaseJwtEnabled()) {
      try {
        const supabaseSession = await signInSupabaseUser({
          email: normalizedEmail,
          password,
        });

        res.status(201).json(buildSupabaseJwtResponse(supabaseSession, buildAuthUserPayload(user)));
        return;
      } catch (error) {
        if (error instanceof SupabaseAuthServiceError && error.code === 'EMAIL_NOT_CONFIRMED') {
          res.status(201).json({
            message: 'Registration succeeded. Confirm your email before signing in.',
            emailConfirmationRequired: true,
            user: buildAuthUserPayload(user),
          });
          return;
        }

        if (handleSupabaseAuthRuntimeError(res, error)) {
          return;
        }

        throw error;
      }
    }

    const session = await createAuthSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      userAgent: req.get('user-agent') ?? null,
      ipAddress: req.ip ?? null,
    });

    res.status(201).json(buildLocalJwtResponse(session, buildAuthUserPayload(user)));
  } catch (error) {
    if (supabaseAuthUserId) {
      await deleteSupabaseAuthUser(supabaseAuthUserId).catch(() => undefined);
    }

    if (isUniqueConstraintError(error)) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    throw error;
  }
}

export async function registerMobileCitizen(req: Request, res: Response): Promise<void> {
  const requestBody = getRequestBodyObject(req);
  const { mobileNumber, password, preferredChannel } = requestBody as {
    mobileNumber?: unknown;
    password?: unknown;
    preferredChannel?: unknown;
  };
  const nameData = buildCanonicalNameCreateData(requestBody);

  if (isMobileAuthProviderBoundaryViolated()) {
    res.status(501).json({ message: MOBILE_AUTH_PROVIDER_BOUNDARY_MESSAGE });
    return;
  }

  if (
    typeof mobileNumber !== 'string' ||
    typeof password !== 'string' ||
    (preferredChannel !== undefined && typeof preferredChannel !== 'string') ||
    !nameData ||
    !mobileNumber.trim() ||
    !password
  ) {
    res.status(422).json({ message: 'name or firstName and lastName, mobileNumber, and password are required' });
    return;
  }

  const canonicalNameData = nameData;
  const canonicalDisplayName = nameData.name;

  const normalizedMobileNumber = normalizeMobileNumber(mobileNumber);
  if (!normalizedMobileNumber) {
    res
      .status(422)
      .json({ message: 'mobileNumber must be a valid normalized Philippine mobile number' });
    return;
  }

  if (!isStrongPassword(password)) {
    res.status(422).json({
      message:
        'password must be at least 12 characters and include uppercase, lowercase, number, and special character',
    });
    return;
  }

  let privacyNoticeAcceptance;

  try {
    privacyNoticeAcceptance = resolvePrivacyNoticeAcceptance(requestBody);
  } catch (error) {
    if (error instanceof PrivacyNoticeAcceptanceError) {
      res.status(422).json({ message: error.message });
      return;
    }

    throw error;
  }

  const existingUser = await prisma.user.findFirst({
    where: withActiveRecords({ mobileNumber: normalizedMobileNumber }),
    select: { id: true },
  });

  if (existingUser) {
    res.status(409).json({ message: 'Mobile number already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const surrogateEmail = buildCitizenMobileSurrogateEmail(normalizedMobileNumber);
  const preferredCitizenChannel =
    typeof preferredChannel === 'string' && preferredChannel.trim()
      ? preferredChannel.trim()
      : 'mobile';

  try {
    const user = await prisma.$transaction(async (transaction) => {
      const citizen = await transaction.citizen.create({
        data: {
          name: canonicalDisplayName,
          firstName: canonicalNameData.firstName,
          middleName: canonicalNameData.middleName,
          lastName: canonicalNameData.lastName,
          suffix: canonicalNameData.suffix,
          contactInfo: normalizedMobileNumber,
          preferredChannel: preferredCitizenChannel,
          privacyNoticeAcceptedAt: privacyNoticeAcceptance?.acceptedAt ?? null,
          privacyNoticeVersion: privacyNoticeAcceptance?.version ?? null,
        },
      });

      return transaction.user.create({
        data: {
          name: canonicalDisplayName,
          firstName: canonicalNameData.firstName,
          middleName: canonicalNameData.middleName,
          lastName: canonicalNameData.lastName,
          suffix: canonicalNameData.suffix,
          email: surrogateEmail,
          mobileNumber: normalizedMobileNumber,
          mobileNumberVerifiedAt: new Date(),
          passwordHash,
          role: 'CITIZEN_REPORTER',
          citizenId: citizen.id,
          privacyNoticeAcceptedAt: privacyNoticeAcceptance?.acceptedAt ?? null,
          privacyNoticeVersion: privacyNoticeAcceptance?.version ?? null,
        },
        select: getAuthUserSelect(),
      });
    });

    const session = await createAuthSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      userAgent: req.get('user-agent') ?? null,
      ipAddress: req.ip ?? null,
    });

    res.status(201).json(buildLocalJwtResponse(session, buildAuthUserPayload(user)));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      res.status(409).json({ message: 'Mobile number already registered' });
      return;
    }

    throw error;
  }
}

// Authenticates a user by email and password, returning a signed JWT.
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password, mfaCode } = getRequestBodyObject(req) as {
    email?: unknown;
    password?: unknown;
    mfaCode?: unknown;
  };

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    (mfaCode !== undefined && typeof mfaCode !== 'string') ||
    !email ||
    !password
  ) {
    res.status(422).json({ message: 'email and password are required' });
    return;
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findFirst({
    where: withActiveRecords({ email: normalizedEmail }),
  });
  if (!user) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  let supabaseJwtSession: {
    token: string;
    refreshToken: string | null;
    tokenType: string;
    sessionId: string | null;
    expiresAt: string | null;
    refreshExpiresAt: string | null;
    userId: string;
    email: string;
  } | null = null;

  if (isSupabaseAuthEnabled()) {
    try {
      const supabaseUser = isSupabaseJwtEnabled()
        ? ((supabaseJwtSession = await signInSupabaseUser({
            email: normalizedEmail,
            password,
          })),
          {
            id: supabaseJwtSession.userId,
            email: supabaseJwtSession.email,
          })
        : await authenticateSupabaseUser({
            email: normalizedEmail,
            password,
          });

      if (user.supabaseAuthUserId && user.supabaseAuthUserId !== supabaseUser.id) {
        await revokeSupabaseTokenQuietly(supabaseJwtSession?.token);
        res.status(409).json({
          message: 'This email is linked to a different Supabase Auth account',
        });
        return;
      }

      if (!user.supabaseAuthUserId) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            supabaseAuthUserId: supabaseUser.id,
          },
        });
        user.supabaseAuthUserId = supabaseUser.id;
      }
    } catch (error) {
      if (handleSupabaseAuthRuntimeError(res, error)) {
        return;
      }

      throw error;
    }
  } else {
    if (!user.passwordHash) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
  }

  const role = normalizeUserRoleInput(user.role) ?? 'CITIZEN_REPORTER';

  if (isPrivilegedMfaFeatureMisconfigured(role)) {
    await revokeSupabaseTokenQuietly(supabaseJwtSession?.token);
    res.status(503).json({
      message:
        'Privileged MFA enforcement is enabled in production but MFA is disabled for this build',
    });
    return;
  }

  if (supabaseJwtSession && requiresSupabaseTotpForUser(role, user.mfaEnabled)) {
    try {
      const assurance = await getSupabaseMfaAssuranceLevel(supabaseJwtSession.token);

      if (assurance.currentLevel !== 'aal2' && assurance.nextLevel === 'aal2') {
        if (!mfaCode) {
          await revokeSupabaseTokenQuietly(supabaseJwtSession.token);
          res.status(401).json({ message: 'MFA code required', mfaRequired: true });
          return;
        }

        if (!supabaseJwtSession.refreshToken) {
          await revokeSupabaseTokenQuietly(supabaseJwtSession.token);
          res.status(503).json({
            message:
              'Supabase MFA could not be completed because the session is missing a refresh token',
          });
          return;
        }

        const factors = await listSupabaseMfaFactors({
          accessToken: supabaseJwtSession.token,
          refreshToken: supabaseJwtSession.refreshToken,
        });
        const factor = [...factors.totp]
          .reverse()
          .find((candidate) => candidate.status === 'verified');

        if (!factor) {
          await revokeSupabaseTokenQuietly(supabaseJwtSession.token);
          res.status(409).json({
            message:
              'MFA is enabled for this account but no verified Supabase TOTP factor is enrolled',
          });
          return;
        }

        supabaseJwtSession = await challengeAndVerifySupabaseTotpFactor({
          accessToken: supabaseJwtSession.token,
          refreshToken: supabaseJwtSession.refreshToken,
          factorId: factor.id,
          code: mfaCode,
        });
      }
    } catch (error) {
      await revokeSupabaseTokenQuietly(supabaseJwtSession.token);

      if (isInvalidSupabaseMfaCodeError(error)) {
        res.status(401).json({ message: 'Invalid MFA code', mfaRequired: true });
        return;
      }

      if (handleSupabaseAuthRuntimeError(res, error)) {
        return;
      }

      throw error;
    }
  }

  if (
    isLocalTotpFeatureEnabled() &&
    MFA_REQUIRED_ROLES.includes(role) &&
    user.mfaEnabled &&
    !requiresSupabaseTotpForUser(role, user.mfaEnabled)
  ) {
    if (!user.mfaSecretEncrypted) {
      await revokeSupabaseTokenQuietly(supabaseJwtSession?.token);
      res.status(500).json({ message: 'MFA is enabled but not configured correctly' });
      return;
    }

    if (!mfaCode) {
      await revokeSupabaseTokenQuietly(supabaseJwtSession?.token);
      res.status(401).json({ message: 'MFA code required', mfaRequired: true });
      return;
    }

    try {
      if (!verifyMfaCode(user.mfaSecretEncrypted, mfaCode)) {
        await revokeSupabaseTokenQuietly(supabaseJwtSession?.token);
        res.status(401).json({ message: 'Invalid MFA code', mfaRequired: true });
        return;
      }
    } catch (error) {
      await revokeSupabaseTokenQuietly(supabaseJwtSession?.token);

      if (handleMfaRuntimeError(res, error)) {
        return;
      }

      throw error;
    }
  }

  if (supabaseJwtSession) {
    res.json(
      applyPrivilegedMfaEnrollmentFlags(
        role,
        user.mfaEnabled,
        buildSupabaseJwtResponse(supabaseJwtSession, buildAuthUserPayload(user)),
      ),
    );
    return;
  }

  const session = await createAuthSession({
    userId: user.id,
    email: user.email,
    role,
    userAgent: req.get('user-agent') ?? null,
    ipAddress: req.ip ?? null,
  });

  res.json(
    applyPrivilegedMfaEnrollmentFlags(role, user.mfaEnabled, {
      ...buildLocalJwtResponse(session, buildAuthUserPayload(user)),
    }),
  );
}

export async function loginMobileCitizen(req: Request, res: Response): Promise<void> {
  const { mobileNumber, password } = getRequestBodyObject(req) as {
    mobileNumber?: unknown;
    password?: unknown;
  };

  if (isMobileAuthProviderBoundaryViolated()) {
    res.status(501).json({ message: MOBILE_AUTH_PROVIDER_BOUNDARY_MESSAGE });
    return;
  }

  if (
    typeof mobileNumber !== 'string' ||
    typeof password !== 'string' ||
    !mobileNumber ||
    !password
  ) {
    res.status(422).json({ message: 'mobileNumber and password are required' });
    return;
  }

  const normalizedMobileNumber = normalizeMobileNumber(mobileNumber);
  if (!normalizedMobileNumber) {
    res
      .status(422)
      .json({ message: 'mobileNumber must be a valid normalized Philippine mobile number' });
    return;
  }

  const user = await prisma.user.findFirst({
    where: withActiveRecords({ mobileNumber: normalizedMobileNumber }),
    select: {
      ...getAuthUserSelect(),
      passwordHash: true,
    },
  });

  if (!user) {
    res.status(401).json({ message: 'Invalid mobile number or password' });
    return;
  }

  if (!isCitizenReporterAccount(user.role)) {
    res.status(403).json({ message: MOBILE_AUTH_ROLE_ONLY_MESSAGE });
    return;
  }

  if (!user.passwordHash) {
    res.status(401).json({ message: 'Invalid mobile number or password' });
    return;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    res.status(401).json({ message: 'Invalid mobile number or password' });
    return;
  }

  const session = await createAuthSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    userAgent: req.get('user-agent') ?? null,
    ipAddress: req.ip ?? null,
  });

  res.json(buildLocalJwtResponse(session, buildAuthUserPayload(user)));
}

// Creates a one-time password reset token for account recovery without exposing whether the email exists.
export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  const { email } = getRequestBodyObject(req) as { email?: string };

  if (!email) {
    res.status(422).json({ message: 'email is required' });
    return;
  }

  try {
    if (process.env.NODE_ENV === 'production' && !isPasswordResetDeliveryConfigured()) {
      res.locals.auditMetadata = {
        resetTokenIssued: false,
        privilegedRecoveryBlocked: false,
        deliveryMode: 'unconfigured',
        deliveryAccepted: false,
        deliveryFailure: true,
      };
      res.status(503).json({
        message:
          'Password reset delivery is not available: PASSWORD_RESET_DELIVERY_WEBHOOK_URL must be configured in production',
      });
      return;
    }

    const resetRequest = await createPasswordResetRequest(normalizeEmail(email));
    const responseBody: Record<string, string> = {
      message: 'If an account with that email exists, a password reset token has been created.',
    };

    res.locals.auditMetadata = {
      resetTokenIssued: Boolean(resetRequest),
      privilegedRecoveryBlocked: false,
      deliveryMode: resetRequest ? 'none' : null,
      deliveryAccepted: resetRequest ? false : null,
    };

    if (resetRequest && !resetRequest.resetTokenIssued) {
      res.locals.auditMetadata = {
        resetTokenIssued: false,
        privilegedRecoveryBlocked: true,
        deliveryMode: 'blocked',
        deliveryAccepted: false,
      };
      res.status(202).json(responseBody);
      return;
    }

    if (resetRequest?.resetTokenIssued) {
      const delivery = await sendPasswordResetMessage(resetRequest);
      res.locals.auditMetadata = {
        resetTokenIssued: true,
        privilegedRecoveryBlocked: false,
        deliveryMode: delivery.mode,
        deliveryAccepted: delivery.accepted,
      };

      if (shouldIncludePasswordResetTokenInResponse(delivery.mode)) {
        responseBody.resetToken = resetRequest.resetToken;
        responseBody.resetExpiresAt = resetRequest.resetExpiresAt;
      }
    }

    res.status(202).json(responseBody);
  } catch (error) {
    if (handlePasswordResetRuntimeError(res, error)) {
      return;
    }

    throw error;
  }
}

// Resets a password with a valid one-time reset token and revokes all existing sessions for that user.
export async function confirmPasswordReset(req: Request, res: Response): Promise<void> {
  const { token, password } = getRequestBodyObject(req) as {
    token?: string;
    password?: string;
  };

  if (!token || !password) {
    res.status(422).json({ message: 'token and password are required' });
    return;
  }

  if (!isStrongPassword(password)) {
    res.status(422).json({
      message:
        'password must be at least 12 characters and include uppercase, lowercase, number, and special character',
    });
    return;
  }

  try {
    const result = await consumePasswordResetToken({
      token,
      beforeConsume: async ({ role }) => {
        if (isPrivilegedPasswordRecoveryBlocked(role)) {
          throw new SupabaseAuthServiceError(
            'PRIVILEGED_PASSWORD_RESET_BLOCKED',
            'Privileged account password reset requires an admin-assisted recovery process',
            403,
          );
        }
      },
      passwordHash: isSupabaseAuthEnabled()
        ? await buildSupabaseManagedPasswordHash()
        : await bcrypt.hash(password, 10),
      beforeCommit: isSupabaseAuthEnabled()
        ? async ({ supabaseAuthUserId }) => {
            if (!supabaseAuthUserId) {
              throw new SupabaseAuthServiceError(
                'USER_NOT_LINKED',
                'Password reset is not available until this account is linked to Supabase Auth',
                409,
              );
            }

            await updateSupabaseAuthUser(supabaseAuthUserId, { password });
          }
        : undefined,
    });

    if (!result) {
      res.status(401).json({ message: 'Invalid or expired password reset token' });
      return;
    }

    res.locals.auditMetadata = {
      sessionsRevoked: true,
      passwordResetCompleted: true,
    };

    res.json({ message: 'Password reset succeeded. Please sign in again.' });
  } catch (error) {
    if (handlePasswordResetRuntimeError(res, error)) {
      return;
    }

    if (handleSupabaseAuthRuntimeError(res, error)) {
      return;
    }

    throw error;
  }
}

// Creates or resets the authenticated privileged user's MFA seed and returns setup details.
export async function setupMfa(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthenticatedRequest).authUser;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  if (isSupabaseTotpEnabled()) {
    const tokens = getSupabaseSessionTokensFromRequest(req);
    if (!tokens) {
      res
        .status(422)
        .json({ message: 'refreshToken is required when Supabase TOTP mode is enabled' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: withActiveRecords({ id: authUser.id }),
      select: {
        id: true,
        email: true,
        supabaseAuthUserId: true,
      },
    });

    if (!user?.supabaseAuthUserId) {
      res.status(409).json({
        message: 'MFA setup is not available until this account is linked to Supabase Auth',
      });
      return;
    }

    try {
      const factors = await listSupabaseAdminMfaFactors(user.supabaseAuthUserId);
      const verifiedTotpFactor = factors.find(
        (factor) => factor.factorType === 'totp' && factor.status === 'verified',
      );

      if (verifiedTotpFactor) {
        res.status(409).json({
          message:
            'MFA is already enabled for this account. Disable it before creating a new setup.',
        });
        return;
      }

      for (const factor of factors) {
        if (factor.factorType === 'totp' && factor.status !== 'verified') {
          await deleteSupabaseAdminMfaFactor(user.supabaseAuthUserId, factor.id);
        }
      }

      const setup = await enrollSupabaseTotpFactor({
        ...tokens,
        friendlyName: `${user.email} TOTP`,
      });

      await prisma.user.update({
        where: { id: authUser.id },
        data: {
          mfaEnabled: false,
          mfaSecretEncrypted: null,
          mfaEnabledAt: null,
        },
      });

      res.json({
        factorId: setup.id,
        secret: setup.secret,
        otpauthUrl: setup.uri,
        qrCode: setup.qrCode,
        issuer: setup.issuer ?? 'Supabase',
        accountName: authUser.email,
      });
      return;
    } catch (error) {
      if (handleSupabaseAuthRuntimeError(res, error)) {
        return;
      }

      throw error;
    }
  }

  try {
    const setup = createMfaSetup(authUser.email);
    await prisma.user.update({
      where: { id: authUser.id },
      data: {
        mfaEnabled: false,
        mfaSecretEncrypted: setup.encryptedSecret,
        mfaEnabledAt: null,
      },
    });

    res.json({
      secret: setup.secret,
      otpauthUrl: setup.otpauthUrl,
      issuer: setup.issuer,
      accountName: authUser.email,
    });
  } catch (error) {
    if (handleMfaRuntimeError(res, error)) {
      return;
    }

    throw error;
  }
}

// Enables MFA for the authenticated privileged user after verifying a TOTP code.
export async function enableMfa(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthenticatedRequest).authUser;
  const { code } = getRequestBodyObject(req) as { code?: string };

  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  if (!code) {
    res.status(422).json({ message: 'code is required' });
    return;
  }

  if (isSupabaseTotpEnabled()) {
    const tokens = getSupabaseSessionTokensFromRequest(req);
    if (!tokens) {
      res
        .status(422)
        .json({ message: 'refreshToken is required when Supabase TOTP mode is enabled' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: withActiveRecords({ id: authUser.id }),
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        supabaseAuthUserId: true,
      },
    });

    if (!user?.supabaseAuthUserId) {
      res.status(409).json({
        message: 'MFA setup is not available until this account is linked to Supabase Auth',
      });
      return;
    }

    try {
      const factors = await listSupabaseMfaFactors(tokens);
      const factor = [...factors.all]
        .reverse()
        .find((candidate) => candidate.factorType === 'totp' && candidate.status !== 'verified');

      if (!factor) {
        res.status(409).json({ message: 'MFA setup must be created before enabling MFA' });
        return;
      }

      const session = await challengeAndVerifySupabaseTotpFactor({
        ...tokens,
        factorId: factor.id,
        code,
      });

      const updatedUser = await prisma.user.update({
        where: { id: authUser.id },
        data: {
          mfaEnabled: true,
          mfaSecretEncrypted: null,
          mfaEnabledAt: new Date(),
        },
        select: {
          ...getAuthUserSelect(),
        },
      });

      res.json({
        message: 'MFA enabled.',
        ...buildSupabaseJwtResponse(session, updatedUser),
      });
      return;
    } catch (error) {
      if (isInvalidSupabaseMfaCodeError(error)) {
        res.status(401).json({ message: 'Invalid MFA code' });
        return;
      }

      if (handleSupabaseAuthRuntimeError(res, error)) {
        return;
      }

      throw error;
    }
  }

  const user = await prisma.user.findFirst({
    where: withActiveRecords({ id: authUser.id }),
    select: {
      id: true,
      mfaSecretEncrypted: true,
    },
  });

  if (!user?.mfaSecretEncrypted) {
    res.status(409).json({ message: 'MFA setup must be created before enabling MFA' });
    return;
  }

  try {
    if (!verifyMfaCode(user.mfaSecretEncrypted, code)) {
      res.status(401).json({ message: 'Invalid MFA code' });
      return;
    }
  } catch (error) {
    if (handleMfaRuntimeError(res, error)) {
      return;
    }

    throw error;
  }

  await prisma.user.update({
    where: { id: authUser.id },
    data: {
      mfaEnabled: true,
      mfaEnabledAt: new Date(),
    },
  });
  await revokeAllUserSessions(authUser.id);

  if (isSupabaseJwtEnabled()) {
    await revokeSupabaseTokenQuietly((req as AuthenticatedRequest).authAccessToken);
  }

  res.json({ message: 'MFA enabled. Please sign in again.' });
}

// Disables MFA for the authenticated privileged user after verifying a TOTP code.
export async function disableMfa(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthenticatedRequest).authUser;
  const { code } = getRequestBodyObject(req) as { code?: string };

  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  if (!code) {
    res.status(422).json({ message: 'code is required' });
    return;
  }

  if (isSupabaseTotpEnabled()) {
    const tokens = getSupabaseSessionTokensFromRequest(req);
    if (!tokens) {
      res
        .status(422)
        .json({ message: 'refreshToken is required when Supabase TOTP mode is enabled' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: withActiveRecords({ id: authUser.id }),
      select: {
        id: true,
        supabaseAuthUserId: true,
      },
    });

    if (!user?.supabaseAuthUserId) {
      res.status(409).json({ message: 'MFA is not enabled for this account' });
      return;
    }

    try {
      const factors = await listSupabaseMfaFactors(tokens);
      const factor = factors.totp.find((candidate) => candidate.status === 'verified');

      if (!factor) {
        res.status(409).json({ message: 'MFA is not enabled for this account' });
        return;
      }

      await challengeAndVerifySupabaseTotpFactor({
        ...tokens,
        factorId: factor.id,
        code,
      });
      await deleteSupabaseAdminMfaFactor(user.supabaseAuthUserId, factor.id);

      await prisma.user.update({
        where: { id: authUser.id },
        data: {
          mfaEnabled: false,
          mfaSecretEncrypted: null,
          mfaEnabledAt: null,
        },
      });

      res.json({ message: 'MFA disabled. Please sign in again.' });
      return;
    } catch (error) {
      if (isInvalidSupabaseMfaCodeError(error)) {
        res.status(401).json({ message: 'Invalid MFA code' });
        return;
      }

      if (handleSupabaseAuthRuntimeError(res, error)) {
        return;
      }

      throw error;
    }
  }

  const user = await prisma.user.findFirst({
    where: withActiveRecords({ id: authUser.id }),
    select: {
      id: true,
      mfaEnabled: true,
      mfaSecretEncrypted: true,
    },
  });

  if (!user?.mfaEnabled || !user.mfaSecretEncrypted) {
    res.status(409).json({ message: 'MFA is not enabled for this account' });
    return;
  }

  try {
    if (!verifyMfaCode(user.mfaSecretEncrypted, code)) {
      res.status(401).json({ message: 'Invalid MFA code' });
      return;
    }
  } catch (error) {
    if (handleMfaRuntimeError(res, error)) {
      return;
    }

    throw error;
  }

  await prisma.user.update({
    where: { id: authUser.id },
    data: {
      mfaEnabled: false,
      mfaSecretEncrypted: null,
      mfaEnabledAt: null,
    },
  });
  await revokeAllUserSessions(authUser.id);

  if (isSupabaseJwtEnabled()) {
    await revokeSupabaseTokenQuietly((req as AuthenticatedRequest).authAccessToken);
  }

  res.json({ message: 'MFA disabled. Please sign in again.' });
}

// Returns the currently authenticated user context from JWT claims.
export async function me(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthenticatedRequest).authUser;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const user = await prisma.user.findFirst({
    where: withActiveRecords({ id: String(authUser.id) }),
    select: getAuthUserSelect(),
  });

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.json(buildAuthUserPayload(user));
}

// Rotates a refresh token and returns a new access token pair for the same session.
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = getRequestBodyObject(req) as { refreshToken?: string };

  if (!refreshToken) {
    res.status(422).json({ message: 'refreshToken is required' });
    return;
  }

  const appSession = await refreshAuthSession({
    refreshToken,
    userAgent: req.get('user-agent') ?? null,
    ipAddress: req.ip ?? null,
  });

  if (appSession) {
    const refreshedSession = await prisma.authSession.findUnique({
      where: { id: appSession.sessionId },
      include: {
        user: {
          select: {
            ...getAuthUserSelect(),
          },
        },
      },
    });

    if (!refreshedSession) {
      res.status(401).json({ message: 'Invalid or expired refresh token' });
      return;
    }

    res.json(buildLocalJwtResponse(appSession, buildAuthUserPayload(refreshedSession.user)));
    return;
  }

  if (isSupabaseJwtEnabled()) {
    try {
      const supabaseSession = await refreshSupabaseSession(refreshToken);
      const user = await getLocalAuthUserForSupabaseIdentity(
        supabaseSession.userId,
        supabaseSession.email,
      );

      if (!user) {
        await revokeSupabaseTokenQuietly(supabaseSession.token);
        res.status(401).json({ message: 'Invalid or expired refresh token' });
        return;
      }

      res.json(buildSupabaseJwtResponse(supabaseSession, buildAuthUserPayload(user)));
      return;
    } catch (error) {
      if (handleSupabaseAuthRuntimeError(res, error)) {
        return;
      }

      throw error;
    }
  }

  res.status(401).json({ message: 'Invalid or expired refresh token' });
}

// Lists the authenticated user's sessions for device/session management UI.
export async function listSessions(req: Request, res: Response): Promise<void> {
  if ((req as AuthenticatedRequest).authProvider === 'supabase') {
    res.status(501).json({
      message: 'Session listing is not available when Supabase JWT mode is enabled',
    });
    return;
  }

  const authUser = (req as AuthenticatedRequest).authUser;
  const currentSessionId = (req as AuthenticatedRequest).authSessionId;
  if (!authUser || !currentSessionId) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const sessions = await listAuthSessionsForUser(authUser.id);
  res.json(
    sessions.map((session) => ({
      ...session,
      isCurrent: session.id === currentSessionId,
    })),
  );
}

// Revokes one of the authenticated user's sessions by session id.
export async function revokeSession(req: Request, res: Response): Promise<void> {
  if ((req as AuthenticatedRequest).authProvider === 'supabase') {
    res.status(501).json({
      message: 'Revoking an arbitrary session is not available when Supabase JWT mode is enabled',
    });
    return;
  }

  const authUser = (req as AuthenticatedRequest).authUser;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const sessionId = req.params.id;
  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ message: 'Invalid session id' });
    return;
  }

  const revoked = await revokeUserSession(authUser.id, sessionId);
  if (!revoked) {
    res.status(404).json({ message: 'Session not found' });
    return;
  }

  res.status(204).send();
}

// Revokes the current authenticated auth session.
export async function logout(req: Request, res: Response): Promise<void> {
  if ((req as AuthenticatedRequest).authProvider === 'supabase') {
    const authAccessToken = (req as AuthenticatedRequest).authAccessToken;
    if (!authAccessToken) {
      res.status(401).json({ message: 'Unauthorized: missing authentication session' });
      return;
    }

    try {
      await revokeSupabaseAccessToken(authAccessToken, 'local');
      res.status(204).send();
      return;
    } catch (error) {
      if (handleSupabaseAuthRuntimeError(res, error)) {
        return;
      }

      throw error;
    }
  }

  const authSessionId = (req as AuthenticatedRequest).authSessionId;
  if (!authSessionId) {
    res.status(401).json({ message: 'Unauthorized: missing authentication session' });
    return;
  }

  await revokeAuthSession(authSessionId);
  res.status(204).send();
}
