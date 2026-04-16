import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import prisma from '../lib/prisma.js';
import { withActiveRecords } from '../utils/archive.js';

export const AMBIGUOUS_LINKED_CITIZEN_MESSAGE =
  'Multiple active citizen profiles match this authenticated account. Contact support.';

export const CONFLICTING_LINKED_CITIZEN_MESSAGE =
  'The citizen profile for this authenticated account is already linked to another active user. Contact support.';

export const MANUAL_LINK_REQUIRED_LINKED_CITIZEN_MESSAGE =
  'A legacy citizen profile matches this authenticated account but is not explicitly linked. Contact support to complete manual linking.';

export const MISSING_LINKED_CITIZEN_MESSAGE =
  'No citizen profile is linked to this authenticated account. Create a citizen profile first.';

type AuthUserIdentity = {
  id: string;
  email: string;
};

type UserCitizenLinkRow = {
  userId: string;
  citizenId: string | null;
  linkedCitizenId: string | null;
};

type ActiveCitizenOwnerRow = {
  userId: string;
};

type CitizenLinkExecutor = Pick<Prisma.TransactionClient, '$executeRaw'>;

export type LinkedCitizenResolution =
  | { status: 'linked'; citizenId: string; source: 'explicit' }
  | { status: 'manual-link-required' }
  | { status: 'conflict' }
  | { status: 'missing' }
  | { status: 'ambiguous' };

async function findActiveUserOwningCitizen(
  citizenId: string,
  excludedUserId: string,
): Promise<ActiveCitizenOwnerRow | null> {
  const ownerRows = await prisma.$queryRaw<ActiveCitizenOwnerRow[]>(Prisma.sql`
    SELECT u.id AS "userId"
    FROM users u
    WHERE u."citizenId" = ${citizenId}::uuid
      AND u.id <> ${excludedUserId}::uuid
      AND u."archivedAt" IS NULL
    LIMIT 1
  `);

  return ownerRows[0] ?? null;
}

export async function assignCitizenToUser(
  userId: string,
  citizenId: string,
  executor: CitizenLinkExecutor = prisma,
): Promise<void> {
  await executor.$executeRaw(
    Prisma.sql`
      UPDATE users
      SET "citizenId" = ${citizenId}::uuid,
          "updatedAt" = NOW()
      WHERE id = ${userId}::uuid
    `,
  );
}

export async function resolveLinkedCitizenForAuthUser(
  authUser: AuthUserIdentity,
): Promise<LinkedCitizenResolution> {
  const userRows = await prisma.$queryRaw<UserCitizenLinkRow[]>(Prisma.sql`
    SELECT
      u.id AS "userId",
      u."citizenId" AS "citizenId",
      c.id AS "linkedCitizenId"
    FROM users u
    LEFT JOIN citizens c
      ON c.id = u."citizenId"
     AND c."archivedAt" IS NULL
    WHERE u.id = ${authUser.id}::uuid
      AND u."archivedAt" IS NULL
    LIMIT 1
  `);

  const user = userRows[0];
  if (!user) {
    return { status: 'missing' };
  }

  if (user.citizenId) {
    if (user.linkedCitizenId) {
      return {
        status: 'linked',
        citizenId: user.linkedCitizenId,
        source: 'explicit',
      };
    }

    return { status: 'missing' };
  }

  const citizens = await prisma.citizen.findMany({
    where: withActiveRecords({ contactInfo: authUser.email }),
    select: { id: true },
    take: 2,
  });

  if (citizens.length === 0) {
    return { status: 'missing' };
  }

  if (citizens.length > 1) {
    return { status: 'ambiguous' };
  }

  const matchedCitizenId = citizens[0].id;
  const activeOwner = await findActiveUserOwningCitizen(matchedCitizenId, authUser.id);
  if (activeOwner) {
    return { status: 'conflict' };
  }

  return { status: 'manual-link-required' };
}

export function handleLinkedCitizenResolution(
  res: Response,
  resolution: LinkedCitizenResolution,
): string | null {
  if (resolution.status === 'linked') {
    return resolution.citizenId;
  }

  if (resolution.status === 'conflict') {
    res.status(409).json({ message: CONFLICTING_LINKED_CITIZEN_MESSAGE });
    return null;
  }

  if (resolution.status === 'manual-link-required') {
    res.status(409).json({ message: MANUAL_LINK_REQUIRED_LINKED_CITIZEN_MESSAGE });
    return null;
  }

  if (resolution.status === 'ambiguous') {
    res.status(409).json({ message: AMBIGUOUS_LINKED_CITIZEN_MESSAGE });
    return null;
  }

  res.status(422).json({ message: MISSING_LINKED_CITIZEN_MESSAGE });
  return null;
}
