import prisma from '../lib/prisma.js';
import { resolveJurisdictionScope } from '../middleware/jurisdiction.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { withActiveRecords, withArchivedRecords } from '../utils/archive.js';

export type AssignmentScope =
  | { kind: 'global' }
  | { kind: 'scoped'; cityMunicipalityIds: string[] };

export type AssignmentIncidentRecord = {
  id: string;
  cityMunicipalityId: string | null;
};

export type AssignmentResponderRecord = {
  id: string;
  agency: {
    cityMunicipalityId: string | null;
  } | null;
};

export type AssignmentRecordWithIncidentScope = {
  id: string;
  incidentId: string;
  responderId: string;
  incident: AssignmentIncidentRecord;
};

export async function resolveAssignmentScope(
  authUser: NonNullable<AuthenticatedRequest['authUser']>,
): Promise<AssignmentScope | null> {
  if (authUser.role === 'NATIONAL_ADMIN') {
    return { kind: 'global' };
  }

  const user = await prisma.user.findFirst({
    where: withActiveRecords({ id: authUser.id }),
    select: { jurisdictionType: true, jurisdictionId: true },
  });

  if (!user) {
    return null;
  }

  const scope = await resolveJurisdictionScope(user.jurisdictionType, user.jurisdictionId);
  const cityMunicipalityIds = scope.cityMunicipalityIds ?? [];

  if (scope.type === 'region' || scope.type === 'province' || scope.type === 'city') {
    return cityMunicipalityIds.length > 0 ? { kind: 'scoped', cityMunicipalityIds } : null;
  }

  return null;
}

export function buildAssignmentScopeWhere(
  baseWhere: Record<string, unknown>,
  scope: AssignmentScope,
): Record<string, unknown> {
  if (scope.kind === 'global') {
    return baseWhere;
  }

  return {
    AND: [
      baseWhere,
      {
        incident: {
          is: {
            cityMunicipalityId: {
              in: scope.cityMunicipalityIds,
            },
          },
        },
      },
      {
        responder: {
          is: {
            agency: {
              is: {
                cityMunicipalityId: {
                  in: scope.cityMunicipalityIds,
                },
              },
            },
          },
        },
      },
    ],
  };
}

export function canManageIncident(
  scope: AssignmentScope,
  incident: AssignmentIncidentRecord,
): boolean {
  if (scope.kind === 'global') {
    return true;
  }

  return Boolean(
    incident.cityMunicipalityId && scope.cityMunicipalityIds.includes(incident.cityMunicipalityId),
  );
}

export function canManageResponder(
  scope: AssignmentScope,
  responder: AssignmentResponderRecord,
): boolean {
  if (scope.kind === 'global') {
    return true;
  }

  return Boolean(
    responder.agency?.cityMunicipalityId &&
    scope.cityMunicipalityIds.includes(responder.agency.cityMunicipalityId),
  );
}

export async function findActiveIncident(
  incidentId: string,
): Promise<AssignmentIncidentRecord | null> {
  return prisma.citizenIncident.findFirst({
    where: withActiveRecords({ id: incidentId }),
    select: { id: true, cityMunicipalityId: true },
  });
}

export async function findActiveResponder(
  responderId: string,
): Promise<AssignmentResponderRecord | null> {
  return prisma.responder.findFirst({
    where: withActiveRecords({ id: responderId }),
    select: {
      id: true,
      agency: {
        select: {
          cityMunicipalityId: true,
        },
      },
    },
  });
}

export async function findScopedActiveAssignment(
  id: string,
  scope: AssignmentScope,
): Promise<AssignmentRecordWithIncidentScope | null> {
  return prisma.assignment.findFirst({
    where: buildAssignmentScopeWhere(withActiveRecords({ id }), scope),
    select: {
      id: true,
      incidentId: true,
      responderId: true,
      incident: {
        select: {
          id: true,
          cityMunicipalityId: true,
        },
      },
    },
  });
}

export async function findScopedArchivedAssignment(
  id: string,
  scope: AssignmentScope,
): Promise<AssignmentRecordWithIncidentScope | null> {
  return prisma.assignment.findFirst({
    where: buildAssignmentScopeWhere(withArchivedRecords({ id }), scope),
    select: {
      id: true,
      incidentId: true,
      responderId: true,
      incident: {
        select: {
          id: true,
          cityMunicipalityId: true,
        },
      },
    },
  });
}
