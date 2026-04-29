import type { Prisma } from '@prisma/client';
import type { Response } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { resolveJurisdictionScope } from '../middleware/jurisdiction.js';
import {
  handleLinkedCitizenResolution,
  resolveLinkedCitizenForAuthUser,
} from './userCitizenLinkService.js';
import { withActiveRecords } from '../utils/archive.js';

export type IncidentReadScope =
  | { kind: 'owner'; citizenId: string; audience: 'owner' }
  | { kind: 'city'; cityMunicipalityIds: string[]; audience: 'internal' }
  | { kind: 'region'; cityMunicipalityIds: string[]; audience: 'internal' }
  | { kind: 'province'; cityMunicipalityIds: string[]; audience: 'internal' }
  | { kind: 'global'; audience: 'internal' }
  | { kind: 'assigned'; responderId: string; audience: 'internal' };

export type IncidentReadScopeOptions = {
  allowNationalAdmin?: boolean;
};

export type IncidentReadScopeResult =
  | { status: 'scoped'; scope: IncidentReadScope }
  | { status: 'denied' }
  | { status: 'response-sent' };

export type IncidentScopeRecord = {
  id: string;
  citizenId: string;
  cityMunicipalityId: string | null;
};

async function resolveCityScopedIncidentReadScope(
  authUserId: string,
): Promise<Extract<IncidentReadScope, { kind: 'city' }> | null> {
  const user = await prisma.user.findFirst({
    where: withActiveRecords({ id: authUserId }),
    select: { jurisdictionType: true, jurisdictionId: true },
  });

  if (!user || user.jurisdictionType !== 'city' || !user.jurisdictionId) {
    return null;
  }

  const scope = await resolveJurisdictionScope(user.jurisdictionType, user.jurisdictionId);
  if (scope.type !== 'city' || !scope.cityMunicipalityIds?.includes(user.jurisdictionId)) {
    return null;
  }

  return {
    kind: 'city',
    cityMunicipalityIds: scope.cityMunicipalityIds,
    audience: 'internal',
  };
}

async function resolveProvinceScopedIncidentReadScope(
  authUserId: string,
): Promise<Extract<IncidentReadScope, { kind: 'province' }> | null> {
  const user = await prisma.user.findFirst({
    where: withActiveRecords({ id: authUserId }),
    select: { jurisdictionType: true, jurisdictionId: true },
  });

  if (!user || user.jurisdictionType !== 'province' || !user.jurisdictionId) {
    return null;
  }

  const scope = await resolveJurisdictionScope(user.jurisdictionType, user.jurisdictionId);
  if (scope.type !== 'province' || !scope.cityMunicipalityIds?.length) {
    return null;
  }

  return {
    kind: 'province',
    cityMunicipalityIds: scope.cityMunicipalityIds,
    audience: 'internal',
  };
}

async function resolveRegionScopedIncidentReadScope(
  authUserId: string,
): Promise<Extract<IncidentReadScope, { kind: 'region' }> | null> {
  const user = await prisma.user.findFirst({
    where: withActiveRecords({ id: authUserId }),
    select: { jurisdictionType: true, jurisdictionId: true },
  });

  if (!user || user.jurisdictionType !== 'region' || !user.jurisdictionId) {
    return null;
  }

  const scope = await resolveJurisdictionScope(user.jurisdictionType, user.jurisdictionId);
  if (scope.type !== 'region' || !scope.cityMunicipalityIds?.length) {
    return null;
  }

  return {
    kind: 'region',
    cityMunicipalityIds: scope.cityMunicipalityIds,
    audience: 'internal',
  };
}

async function resolveAssignedResponderId(authUserEmail: string): Promise<string | null> {
  const responders = await prisma.responder.findMany({
    where: withActiveRecords({ contactInfo: authUserEmail }),
    select: { id: true },
    take: 2,
  });

  if (responders.length !== 1) {
    return null;
  }

  return responders[0].id;
}

export async function resolveIncidentReadScope(
  authUser: NonNullable<AuthenticatedRequest['authUser']>,
  res: Response,
  options: IncidentReadScopeOptions = {},
): Promise<IncidentReadScopeResult> {
  if (authUser.role === 'CITIZEN_REPORTER') {
    const resolution = await resolveLinkedCitizenForAuthUser({
      id: authUser.id,
      email: authUser.email,
    });
    const citizenId = handleLinkedCitizenResolution(res, resolution);
    if (!citizenId) {
      return { status: 'response-sent' };
    }

    return {
      status: 'scoped',
      scope: {
        kind: 'owner',
        citizenId,
        audience: 'owner',
      },
    };
  }

  if (options.allowNationalAdmin && authUser.role === 'NATIONAL_ADMIN') {
    return {
      status: 'scoped',
      scope: {
        kind: 'global',
        audience: 'internal',
      },
    };
  }

  if (authUser.role === 'CITY_ADMIN' || authUser.role === 'DISPATCHER') {
    const scope = await resolveCityScopedIncidentReadScope(authUser.id);
    return scope ? { status: 'scoped', scope } : { status: 'denied' };
  }

  if (authUser.role === 'REGIONAL_DIRECTOR') {
    const scope = await resolveRegionScopedIncidentReadScope(authUser.id);
    return scope ? { status: 'scoped', scope } : { status: 'denied' };
  }

  if (authUser.role === 'PROVINCIAL_ADMIN') {
    const scope = await resolveProvinceScopedIncidentReadScope(authUser.id);
    return scope ? { status: 'scoped', scope } : { status: 'denied' };
  }

  if (authUser.role === 'RESPONDER') {
    const responderId = await resolveAssignedResponderId(authUser.email);
    return responderId
      ? {
          status: 'scoped',
          scope: {
            kind: 'assigned',
            responderId,
            audience: 'internal',
          },
        }
      : { status: 'denied' };
  }

  return { status: 'denied' };
}

export function buildIncidentReadScopeWhere(
  scope: IncidentReadScope,
): Prisma.CitizenIncidentWhereInput {
  if (scope.kind === 'owner') {
    return { citizenId: scope.citizenId };
  }

  if (scope.kind === 'global') {
    return {};
  }

  if (scope.kind === 'city' || scope.kind === 'region' || scope.kind === 'province') {
    return { cityMunicipalityId: { in: scope.cityMunicipalityIds } };
  }

  return {
    assignments: {
      some: withActiveRecords({ responderId: scope.responderId }),
    },
  };
}

export async function canReadIncidentWithScope(
  scope: IncidentReadScope,
  incident: IncidentScopeRecord,
): Promise<boolean> {
  if (scope.kind === 'owner') {
    return incident.citizenId === scope.citizenId;
  }

  if (scope.kind === 'global') {
    return true;
  }

  if (scope.kind === 'city' || scope.kind === 'region' || scope.kind === 'province') {
    return Boolean(
      incident.cityMunicipalityId &&
      scope.cityMunicipalityIds.includes(incident.cityMunicipalityId),
    );
  }

  const assignment = await prisma.assignment.findFirst({
    where: withActiveRecords({
      incidentId: incident.id,
      responderId: scope.responderId,
    }),
    select: { id: true },
  });

  return Boolean(assignment);
}
