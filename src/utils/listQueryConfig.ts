import type { ListQueryConfig } from './request.js';

const textOps = ['equals', 'contains', 'in'] as const;
const uuidOps = ['equals', 'in'] as const;
const dateOps = ['equals', 'gt', 'gte', 'lt', 'lte', 'between'] as const;
const integerOps = ['equals', 'in', 'gt', 'gte', 'lt', 'lte', 'between'] as const;

export const citizensListQueryConfig: ListQueryConfig = {
  resource: 'citizens',
  defaultSortBy: 'createdAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    name: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    contactInfo: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    preferredChannel: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const respondersListQueryConfig: ListQueryConfig = {
  resource: 'responders',
  defaultSortBy: 'createdAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    name: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    agencyId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    role: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    contactInfo: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const statusesListQueryConfig: ListQueryConfig = {
  resource: 'statuses',
  defaultSortBy: 'createdAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    name: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const categoriesListQueryConfig: ListQueryConfig = {
  resource: 'categories',
  defaultSortBy: 'createdAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    name: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    subCategory: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const severitiesListQueryConfig: ListQueryConfig = {
  resource: 'severities',
  defaultSortBy: 'createdAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    level: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    definition: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const incidentsListQueryConfig: ListQueryConfig = {
  resource: 'incidents',
  defaultSortBy: 'createdAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    description: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    mediaUrl: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    dateReported: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    statusId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    citizenId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    categoryId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    severityId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const incidentsAuditListQueryConfig: ListQueryConfig = {
  resource: 'incidents-audit',
  defaultSortBy: 'createdAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    publicReference: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    barangay: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    cityName: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    provinceName: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    regionName: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    statusId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    categoryId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    severityId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    dateReported: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const assignmentsListQueryConfig: ListQueryConfig = {
  resource: 'assignments',
  defaultSortBy: 'createdAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    incidentId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    responderId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    assignedDate: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    responseStart: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    responseEnd: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    outcome: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    notes: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const agenciesListQueryConfig: ListQueryConfig = {
  resource: 'agencies',
  defaultSortBy: 'createdAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    name: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    contactNumber: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const usersListQueryConfig: ListQueryConfig = {
  resource: 'users',
  defaultSortBy: 'createdAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    name: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    email: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    role: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const auditLogsListQueryConfig: ListQueryConfig = {
  resource: 'audit-logs',
  defaultSortBy: 'timestamp',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    timestamp: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    action: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    summary: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    outcome: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    actorUserId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    actorEmail: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    actorRole: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    resource: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    method: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    path: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    statusCode: { type: 'integer', sortable: true, filterOperators: [...integerOps] },
    targetId: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    requestId: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

const { requestId: _auditLogsRequestIdField, ...auditorAuditLogFields } =
  auditLogsListQueryConfig.fields;

export const auditorAuditLogsListQueryConfig: ListQueryConfig = {
  ...auditLogsListQueryConfig,
  fields: auditorAuditLogFields,
};

export const mobileAppContentListQueryConfig: ListQueryConfig = {
  resource: 'mobile-content',
  defaultSortBy: 'updatedAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    slug: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    title: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    contentType: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    placement: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    audience: {
      type: 'string',
      searchable: true,
      sortable: true,
      filterOperators: [...textOps],
    },
    sortOrder: { type: 'integer', sortable: true, filterOperators: [...integerOps] },
    publishedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    startsAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    endsAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const regionsListQueryConfig: ListQueryConfig = {
  resource: 'regions',
  defaultSortBy: 'name',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    code: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    name: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const provincesListQueryConfig: ListQueryConfig = {
  resource: 'provinces',
  defaultSortBy: 'name',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    code: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    name: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    regionId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const citiesMunicipalitiesListQueryConfig: ListQueryConfig = {
  resource: 'cities-municipalities',
  defaultSortBy: 'name',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    code: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    name: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    type: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    provinceId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const barangaysListQueryConfig: ListQueryConfig = {
  resource: 'barangays',
  defaultSortBy: 'name',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    code: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    name: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    cityMunicipalityId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const incidentEscalationsListQueryConfig: ListQueryConfig = {
  resource: 'incident-escalations',
  defaultSortBy: 'createdAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    incidentId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    escalatedById: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    fromLevel: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    toLevel: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    status: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};

export const mutualAidRequestsListQueryConfig: ListQueryConfig = {
  resource: 'mutual-aid-requests',
  defaultSortBy: 'createdAt',
  fields: {
    id: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    incidentId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    requestingJurisdictionId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    targetJurisdictionId: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    requestedById: { type: 'uuid', sortable: true, filterOperators: [...uuidOps] },
    status: { type: 'string', searchable: true, sortable: true, filterOperators: [...textOps] },
    createdAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
    updatedAt: { type: 'datetime', sortable: true, filterOperators: [...dateOps] },
  },
};
