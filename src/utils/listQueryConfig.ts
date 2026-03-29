import type { ListQueryConfig } from './request.js';

const textOps = ['equals', 'contains', 'in'] as const;
const uuidOps = ['equals', 'in'] as const;
const dateOps = ['equals', 'gt', 'gte', 'lt', 'lte', 'between'] as const;

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
