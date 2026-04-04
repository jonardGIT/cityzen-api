import { createHash, randomBytes } from 'crypto';
import prisma from '../lib/prisma.js';
import { isArchiveEnabled, withActiveRecords } from '../utils/archive.js';

const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 30;

function getPasswordResetTtlMinutes(): number {
  const rawValue = process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES?.trim();
  if (!rawValue) {
    return DEFAULT_PASSWORD_RESET_TTL_MINUTES;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PASSWORD_RESET_TTL_MINUTES;
}

function buildPasswordResetExpiry(): Date {
  return new Date(Date.now() + getPasswordResetTtlMinutes() * 60 * 1000);
}

function generatePasswordResetToken(): string {
  return randomBytes(32).toString('hex');
}

function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(email: string): Promise<{
  resetToken: string;
  resetExpiresAt: string;
} | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: withActiveRecords({ email: normalizedEmail }) as any,
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  const resetToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(resetToken);
  const expiresAt = buildPasswordResetExpiry();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  return {
    resetToken,
    resetExpiresAt: expiresAt.toISOString(),
  };
}

export async function resetPasswordWithToken(input: {
  token: string;
  passwordHash: string | null;
  beforeCommit?: (context: {
    userId: string;
    email: string;
    supabaseAuthUserId: string | null;
  }) => Promise<void>;
}): Promise<{ userId: string; email: string } | null> {
  const tokenHash = hashPasswordResetToken(input.token);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const resetToken = await tx.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            supabaseAuthUserId: true,
            archivedAt: true,
          },
        },
      },
    });

    if (!resetToken || (isArchiveEnabled() && resetToken.user.archivedAt !== null)) {
      return null;
    }

    const consumeResult = await tx.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    if (consumeResult.count === 0) {
      return null;
    }

    if (input.beforeCommit) {
      await input.beforeCommit({
        userId: resetToken.user.id,
        email: resetToken.user.email,
        supabaseAuthUserId: resetToken.user.supabaseAuthUserId,
      });
    }

    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash: input.passwordHash === null ? { set: null } : input.passwordHash,
      },
    });

    await tx.authSession.updateMany({
      where: {
        userId: resetToken.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    return {
      userId: resetToken.user.id,
      email: resetToken.user.email,
    };
  });
}

export function shouldExposePasswordResetToken(): boolean {
  return process.env.NODE_ENV !== 'production';
}
