import { OpenAPIV3 } from 'openapi-types';

const idParameter: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Resource identifier.',
  schema: { type: 'string' },
};

const paginationParameters: OpenAPIV3.ParameterObject[] = [
  {
    name: 'page',
    in: 'query',
    required: false,
    description: 'Page number. Enables paginated response mode when supplied.',
    schema: { type: 'integer', minimum: 1, default: 1 },
  },
  {
    name: 'pageSize',
    in: 'query',
    required: false,
    description: 'Page size. Maximum 100.',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
  {
    name: 'search',
    in: 'query',
    required: false,
    description: 'Free-text search over resource-specific searchable fields.',
    schema: { type: 'string' },
  },
  {
    name: 'sortBy',
    in: 'query',
    required: false,
    description: 'Sortable field name for the resource. Unsupported fields return 422.',
    schema: { type: 'string', default: 'createdAt' },
  },
  {
    name: 'sortOrder',
    in: 'query',
    required: false,
    description: 'Sort direction.',
    schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
  {
    name: 'filters',
    in: 'query',
    required: false,
    description:
      'JSON string for arbitrary column filters. Example: [{"field":"name","operator":"contains","value":"juan"}]. Operators: equals, contains, in, gt, gte, lt, lte, between.',
    schema: { type: 'string' },
  },
  {
    name: 'includeArchived',
    in: 'query',
    required: false,
    description: 'When true, returns both active and archived rows for archive-enabled resources.',
    schema: { type: 'boolean', default: false },
  },
  {
    name: 'archivedOnly',
    in: 'query',
    required: false,
    description:
      'When true, returns only archived rows for archive-enabled resources. Cannot be combined with includeArchived=true.',
    schema: { type: 'boolean', default: false },
  },
  {
    name: 'createdFrom',
    in: 'query',
    required: false,
    schema: { type: 'string', format: 'date-time' },
  },
  {
    name: 'createdTo',
    in: 'query',
    required: false,
    schema: { type: 'string', format: 'date-time' },
  },
  {
    name: 'updatedFrom',
    in: 'query',
    required: false,
    schema: { type: 'string', format: 'date-time' },
  },
  {
    name: 'updatedTo',
    in: 'query',
    required: false,
    schema: { type: 'string', format: 'date-time' },
  },
];

const auditLogPaginationParameters: OpenAPIV3.ParameterObject[] = paginationParameters.map(
  (parameter) => {
    if (parameter.name !== 'sortBy') {
      return parameter;
    }

    return {
      ...parameter,
      description:
        'Sortable field name for audit logs. Unsupported fields return 422. Defaults to timestamp.',
      schema: { type: 'string', default: 'timestamp' },
    };
  },
);

const auditLogExample: OpenAPIV3.ExampleObject = {
  summary: 'Successful citizen creation audit record',
  value: {
    id: '6ee87a02-7d53-4bba-8ab8-08b7d5fb70cf',
    createdAt: '2026-03-29T09:15:12.418Z',
    updatedAt: '2026-03-29T09:15:12.418Z',
    timestamp: '2026-03-29T09:15:12.408Z',
    action: 'create',
    summary: 'create citizens (0e9189c3-4465-4fa4-823c-2452a021cd05) succeeded',
    outcome: 'success',
    actorUserId: '70000000-0000-0000-0000-000000000001',
    actorEmail: 'admin@xypes.local',
    actorRole: 'SYSTEM_ADMIN',
    resource: 'citizens',
    method: 'POST',
    path: '/citizens',
    statusCode: 201,
    targetId: '0e9189c3-4465-4fa4-823c-2452a021cd05',
    ipAddress: '::1',
    userAgent: 'Mozilla/5.0',
    requestId: '5bc9d7da-a615-4998-bdc6-6be4340656eb',
    metadata: {
      message: 'Citizen created successfully',
    },
  },
};

const paginatedAuditLogListExample: OpenAPIV3.ExampleObject = {
  summary: 'Paginated audit log list',
  value: {
    data: [auditLogExample.value],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  },
};

const systemAdminCapabilitiesExample: OpenAPIV3.ExampleObject = {
  summary: 'System admin capabilities',
  value: {
    role: 'SYSTEM_ADMIN',
    label: 'System Admin',
    permissions: [
      'user:manage:global',
      'role:manage:global',
      'settings:manage:global',
      'incident:delete:global',
      'audit:read:global',
      'audit:export:global',
    ],
    scope: 'global',
    canUpdateUser: true,
    canDeleteUser: true,
  },
};

const departmentManagerCapabilitiesExample: OpenAPIV3.ExampleObject = {
  summary: 'Department manager capabilities',
  value: {
    role: 'DEPARTMENT_MANAGER',
    label: 'Department Manager',
    permissions: [
      'user:create:department',
      'user:read:department',
      'user:update:department',
      'user:reset_password:department',
      'reference:manage:department',
      'incident:read:department',
    ],
    scope: 'department',
    canUpdateUser: true,
    canDeleteUser: false,
  },
};

const auditorCapabilitiesExample: OpenAPIV3.ExampleObject = {
  summary: 'Auditor capabilities',
  value: {
    role: 'AUDITOR',
    label: 'Auditor',
    permissions: [
      'incident:read:global',
      'audit:read:global',
      'audit:export:global',
      'user:read:redacted',
    ],
    scope: 'global',
    canUpdateUser: false,
    canDeleteUser: false,
  },
};

const citizenReporterCapabilitiesExample: OpenAPIV3.ExampleObject = {
  summary: 'Citizen reporter capabilities',
  value: {
    role: 'CITIZEN_REPORTER',
    label: 'Citizen Reporter',
    permissions: [
      'citizen:link:self',
      'incident:create:self',
      'incident:read:self',
      'incident:update:self',
      'media:upload:self',
    ],
    scope: 'own',
    canUpdateUser: false,
    canDeleteUser: false,
  },
};

function jsonResponse(
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  description: string,
): OpenAPIV3.ResponseObject {
  return {
    description,
    content: {
      'application/json': {
        schema,
      },
    },
  };
}

function listResponse(schemaName: string): OpenAPIV3.ResponseObject {
  return jsonResponse(
    {
      oneOf: [
        {
          type: 'array',
          items: { $ref: `#/components/schemas/${schemaName}` },
        },
        { $ref: `#/components/schemas/Paginated${schemaName}List` },
      ],
    },
    `List of ${schemaName} resources, or a paginated envelope when page/pageSize is supplied.`,
  );
}

const apiKeySecurity: OpenAPIV3.SecurityRequirementObject[] = [{ ApiKeyAuth: [] }];
const apiKeyAndBearerSecurity: OpenAPIV3.SecurityRequirementObject[] = [
  { ApiKeyAuth: [], BearerAuth: [] },
];

function getAuthResponses(
  security?: OpenAPIV3.SecurityRequirementObject[],
): Record<string, OpenAPIV3.ResponseObject> {
  if (!security) {
    return {};
  }

  const requiresBearer = security.some((requirement) => 'BearerAuth' in requirement);
  return {
    '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
    ...(requiresBearer
      ? {
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
        }
      : {}),
  };
}

function resourcePath(
  pathSegment: string,
  schemaName: string,
  createRequestName: string,
  updateRequestName: string,
  readSecurity?: OpenAPIV3.SecurityRequirementObject[],
  writeSecurity?: OpenAPIV3.SecurityRequirementObject[],
): Record<string, OpenAPIV3.PathItemObject> {
  const pluralPath = `/${pathSegment}`;
  return {
    [pluralPath]: {
      get: {
        tags: [schemaName],
        summary: `List ${schemaName.toLowerCase()}s`,
        security: readSecurity,
        parameters: paginationParameters,
        responses: {
          '200': listResponse(schemaName),
          ...getAuthResponses(readSecurity),
          '422': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid list query parameters.',
          ),
        },
      },
      post: {
        tags: [schemaName],
        summary: `Create ${schemaName.toLowerCase()}`,
        security: writeSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${createRequestName}` },
            },
          },
        },
        responses: {
          '201': jsonResponse(
            { $ref: `#/components/schemas/${schemaName}` },
            `${schemaName} created.`,
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '409': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Conflict.'),
        },
      },
    },
    [pluralPath + '/{id}']: {
      get: {
        tags: [schemaName],
        summary: `Get ${schemaName.toLowerCase()} by id`,
        security: readSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse(
            { $ref: `#/components/schemas/${schemaName}` },
            `${schemaName} found.`,
          ),
          ...getAuthResponses(readSecurity),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Not found.'),
        },
      },
      patch: {
        tags: [schemaName],
        summary: `Update ${schemaName.toLowerCase()}`,
        security: writeSecurity,
        parameters: [idParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${updateRequestName}` },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            { $ref: `#/components/schemas/${schemaName}` },
            `${schemaName} updated.`,
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Not found.'),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
      delete: {
        tags: [schemaName],
        summary: `Archive ${schemaName.toLowerCase()}`,
        security: writeSecurity,
        parameters: [idParameter],
        responses: {
          '204': { description: `${schemaName} archived.` },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Not found.'),
          '409': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Conflict.'),
        },
      },
    },
    [pluralPath + '/{id}/restore']: {
      post: {
        tags: [schemaName],
        summary: `Restore ${schemaName.toLowerCase()}`,
        security: writeSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse(
            { $ref: `#/components/schemas/${schemaName}` },
            `${schemaName} restored.`,
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Not found.'),
          '409': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Conflict.'),
        },
      },
    },
  };
}

export const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Xypes CIRS API',
    version: '1.0.0',
    description:
      'OpenAPI definition aligned to the current Express and Prisma implementation, including optional Supabase Auth and MFA integration, Supabase Storage incident media uploads, persistent audit logging, and archive-by-default CRUD management with restore and archived-list browsing flows.',
  },
  servers: [{ url: '/api/v1', description: 'Versioned API base path' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Admin' },
    { name: 'AuditLog' },
    { name: 'Citizen' },
    { name: 'Agency' },
    { name: 'Responder' },
    { name: 'Status' },
    { name: 'Category' },
    { name: 'Severity' },
    { name: 'Incident' },
    { name: 'Assignment' },
    { name: 'User' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: {
          '200': jsonResponse(
            {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' },
              },
              required: ['status'],
            },
            'API is healthy.',
          ),
        },
      },
    },
    '/openapi.json': {
      get: {
        tags: ['Health'],
        summary: 'Return the OpenAPI document',
        description: 'Available only outside production.',
        security: [],
        responses: {
          '200': jsonResponse({ type: 'object' }, 'OpenAPI document.'),
        },
      },
    },
    ...resourcePath(
      'citizens',
      'Citizen',
      'CreateCitizenRequest',
      'UpdateCitizenRequest',
      apiKeyAndBearerSecurity,
      apiKeyAndBearerSecurity,
    ),
    '/citizens/link-me': {
      post: {
        tags: ['Citizen'],
        summary: "Create or update the authenticated citizen reporter's citizen profile",
        description:
          'Available to authenticated CITIZEN_REPORTER users. Creates a linked citizen profile on first use or updates the existing linked profile.',
        security: apiKeyAndBearerSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LinkMyCitizenProfileRequest' },
            },
          },
        },
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/Citizen' }, 'Citizen profile updated.'),
          '201': jsonResponse({ $ref: '#/components/schemas/Citizen' }, 'Citizen profile created.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    ...resourcePath(
      'agencies',
      'Agency',
      'CreateAgencyRequest',
      'UpdateAgencyRequest',
      apiKeyAndBearerSecurity,
      apiKeyAndBearerSecurity,
    ),
    ...resourcePath(
      'responders',
      'Responder',
      'CreateResponderRequest',
      'UpdateResponderRequest',
      apiKeyAndBearerSecurity,
      apiKeyAndBearerSecurity,
    ),
    ...resourcePath(
      'statuses',
      'Status',
      'CreateStatusRequest',
      'UpdateStatusRequest',
      apiKeyAndBearerSecurity,
      apiKeyAndBearerSecurity,
    ),
    ...resourcePath(
      'categories',
      'Category',
      'CreateCategoryRequest',
      'UpdateCategoryRequest',
      apiKeyAndBearerSecurity,
      apiKeyAndBearerSecurity,
    ),
    ...resourcePath(
      'severities',
      'Severity',
      'CreateSeverityRequest',
      'UpdateSeverityRequest',
      apiKeyAndBearerSecurity,
      apiKeyAndBearerSecurity,
    ),
    '/incidents': {
      get: {
        tags: ['Incident'],
        summary: 'List incidents',
        security: apiKeyAndBearerSecurity,
        parameters: paginationParameters,
        responses: {
          '200': listResponse('CitizenIncident'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '422': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Missing linked citizen profile.',
          ),
        },
      },
      post: {
        tags: ['Incident'],
        summary: 'Create incident',
        security: apiKeyAndBearerSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateIncidentRequest' },
            },
          },
        },
        responses: {
          '201': jsonResponse(
            { $ref: '#/components/schemas/CitizenIncident' },
            'Incident created.',
          ),
          '400': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid foreign key or input.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
        },
      },
    },
    '/incidents/media/upload': {
      post: {
        tags: ['Incident'],
        summary: 'Upload incident media to Supabase Storage',
        description:
          'Accepts either one base64-encoded file or a `files` array and returns public media URLs that can be stored on an incident record. Requires `SUPABASE_STORAGE_ENABLED=true` and a public storage bucket configuration.',
        security: apiKeyAndBearerSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UploadIncidentMediaRequest' },
            },
          },
        },
        responses: {
          '201': jsonResponse(
            { $ref: '#/components/schemas/UploadIncidentMediaResponse' },
            'Incident media uploaded.',
          ),
          '400': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid upload payload.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '413': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Uploaded media exceeds the configured size limit.',
          ),
          '503': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Supabase Storage is disabled or misconfigured.',
          ),
        },
      },
    },
    '/incidents/report': {
      post: {
        tags: ['Incident'],
        summary: 'Create an incident report for the authenticated citizen reporter',
        description:
          'Available to authenticated CITIZEN_REPORTER users with a linked citizen profile. The server derives the citizen identity from the authenticated account.',
        security: apiKeyAndBearerSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCitizenIncidentReportRequest' },
            },
          },
        },
        responses: {
          '201': jsonResponse(
            { $ref: '#/components/schemas/CitizenIncident' },
            'Incident report created.',
          ),
          '400': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid foreign key or input.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '422': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Missing linked citizen profile.',
          ),
        },
      },
    },
    '/incidents/{id}': {
      get: {
        tags: ['Incident'],
        summary: 'Get incident by id',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/CitizenIncident' }, 'Incident found.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Incident not found.',
          ),
        },
      },
      patch: {
        tags: ['Incident'],
        summary: 'Update incident',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateIncidentRequest' },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/CitizenIncident' },
            'Incident updated.',
          ),
          '400': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid foreign key or input.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Incident not found.',
          ),
        },
      },
      delete: {
        tags: ['Incident'],
        summary: 'Archive incident',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '204': { description: 'Incident archived.' },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Incident not found.',
          ),
        },
      },
    },
    '/incidents/{id}/restore': {
      post: {
        tags: ['Incident'],
        summary: 'Restore incident',
        description:
          'Restores an archived incident when archive mode is enabled. Incident restore requires the linked status, citizen, category, and severity to already be active. Archived assignments linked to the incident are also restored when their responders are active.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/CitizenIncident' },
            'Incident restored.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Archived incident not found.',
          ),
          '409': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Conflict.'),
        },
      },
    },
    '/assignments': {
      get: {
        tags: ['Assignment'],
        summary: 'List assignments',
        description:
          'Available to assignment-management roles only: SYSTEM_ADMIN, DEPARTMENT_MANAGER, SUPERVISOR, and DISPATCHER.',
        security: apiKeyAndBearerSecurity,
        parameters: paginationParameters,
        responses: {
          '200': listResponse('Assignment'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
        },
      },
      post: {
        tags: ['Assignment'],
        summary: 'Create assignment',
        description:
          'Available to assignment-management roles only: SYSTEM_ADMIN, DEPARTMENT_MANAGER, SUPERVISOR, and DISPATCHER.',
        security: apiKeyAndBearerSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateAssignmentRequest' },
            },
          },
        },
        responses: {
          '201': jsonResponse({ $ref: '#/components/schemas/Assignment' }, 'Assignment created.'),
          '400': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Invalid UUID.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '422': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid foreign key reference.',
          ),
        },
      },
    },
    '/assignments/{id}': {
      get: {
        tags: ['Assignment'],
        summary: 'Get assignment by id',
        description:
          'Available to assignment-management roles only: SYSTEM_ADMIN, DEPARTMENT_MANAGER, SUPERVISOR, and DISPATCHER.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/Assignment' }, 'Assignment found.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Assignment not found.',
          ),
        },
      },
      patch: {
        tags: ['Assignment'],
        summary: 'Update assignment',
        description:
          'Available to assignment-management roles only: SYSTEM_ADMIN, DEPARTMENT_MANAGER, SUPERVISOR, and DISPATCHER.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateAssignmentRequest' },
            },
          },
        },
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/Assignment' }, 'Assignment updated.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Assignment not found.',
          ),
          '422': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid foreign key reference.',
          ),
        },
      },
      delete: {
        tags: ['Assignment'],
        summary: 'Archive assignment',
        description:
          'Available to assignment-management roles only: SYSTEM_ADMIN, DEPARTMENT_MANAGER, SUPERVISOR, and DISPATCHER.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '204': { description: 'Assignment archived.' },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Assignment not found.',
          ),
        },
      },
    },
    '/assignments/{id}/restore': {
      post: {
        tags: ['Assignment'],
        summary: 'Restore assignment',
        description:
          'Available to assignment-management roles only: SYSTEM_ADMIN, DEPARTMENT_MANAGER, SUPERVISOR, and DISPATCHER. Restore requires both the linked incident and responder to already be active.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/Assignment' }, 'Assignment restored.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Archived assignment not found.',
          ),
          '409': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Conflict.'),
        },
      },
    },
    '/users/capabilities': {
      get: {
        tags: ['User'],
        summary: 'Get authenticated user role capabilities',
        description:
          'Returns the authenticated user role, label, scope, permission list, and dashboard-friendly booleans. This endpoint is available to any authenticated user, not only admin roles. `canUpdateUser` maps to `user:update:department` or `user:manage:global`. `canDeleteUser` maps to `user:manage:global` only.',
        security: apiKeyAndBearerSecurity,
        responses: {
          '200': {
            description: 'Role capability metadata.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserCapabilities' },
                examples: {
                  systemAdmin: systemAdminCapabilitiesExample,
                  departmentManager: departmentManagerCapabilitiesExample,
                  auditor: auditorCapabilitiesExample,
                  citizenReporter: citizenReporterCapabilitiesExample,
                },
              },
            },
          },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
        },
      },
    },
    '/users': {
      get: {
        tags: ['User'],
        summary: 'List users',
        description:
          'Available to SYSTEM_ADMIN and DEPARTMENT_MANAGER. User-management authority is explicit and target-role aware, not based on a universal descending role ladder.',
        security: apiKeyAndBearerSecurity,
        parameters: paginationParameters,
        responses: {
          '200': listResponse('UserSummary'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
        },
      },
      post: {
        tags: ['User'],
        summary: 'Create user',
        description:
          "Available to SYSTEM_ADMIN and DEPARTMENT_MANAGER. The backend rejects creation of target roles outside the caller's manageable set.",
        security: apiKeyAndBearerSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUserRequest' },
            },
          },
        },
        responses: {
          '201': jsonResponse({ $ref: '#/components/schemas/UserSummary' }, 'User created.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '409': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Email already exists.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['User'],
        summary: 'Get user by id',
        description: 'Available to SYSTEM_ADMIN and DEPARTMENT_MANAGER.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/UserSummary' }, 'User found.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'User not found.'),
        },
      },
      patch: {
        tags: ['User'],
        summary: 'Update user',
        description:
          'Available to SYSTEM_ADMIN and DEPARTMENT_MANAGER. The backend enforces explicit target-role management rules rather than a generic role hierarchy.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateUserRequest' },
            },
          },
        },
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/UserSummary' }, 'User updated.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'User not found.'),
          '409': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Email already exists.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
      delete: {
        tags: ['User'],
        summary: 'Archive user',
        description:
          'Available to SYSTEM_ADMIN and DEPARTMENT_MANAGER. Only SYSTEM_ADMIN has global destructive user-management capability.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '204': { description: 'User archived.' },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'User not found.'),
        },
      },
    },
    '/users/{id}/restore': {
      post: {
        tags: ['User'],
        summary: 'Restore user',
        description:
          'Available to SYSTEM_ADMIN and DEPARTMENT_MANAGER when archive mode is enabled.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/UserSummary' }, 'User restored.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Archived user not found.',
          ),
          '409': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Conflict.'),
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a citizen reporter account',
        description:
          'Creates a self-service account with the default role CITIZEN_REPORTER and immediately returns access and refresh tokens.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': jsonResponse(
            { $ref: '#/components/schemas/AuthResponse' },
            'Registration succeeded.',
          ),
          '409': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Email already registered.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate user and return access and refresh tokens',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/AuthResponse' },
            'Authentication succeeded.',
          ),
          '401': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid credentials.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/auth/password-reset/request': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset token',
        description:
          'Accepts an email address and creates a one-time password reset token when the account exists. The response stays generic to avoid revealing whether the email exists. In non-production environments, the reset token is returned for local testing.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PasswordResetRequestRequest' },
            },
          },
        },
        responses: {
          '202': jsonResponse(
            { $ref: '#/components/schemas/PasswordResetRequestResponse' },
            'Password reset request accepted.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/auth/password-reset/confirm': {
      post: {
        tags: ['Auth'],
        summary: 'Reset a password with a one-time token',
        description:
          'Accepts a valid one-time password reset token plus a new password, then revokes all existing sessions for the user.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PasswordResetConfirmRequest' },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/MessageResponse' },
            'Password reset succeeded.',
          ),
          '401': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid or expired password reset token.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/auth/mfa/setup': {
      post: {
        tags: ['Auth'],
        summary: 'Create or reset MFA setup for a privileged account',
        description:
          'Creates a new TOTP seed for the authenticated privileged user and returns the shared secret plus otpauth URL for authenticator app enrollment. When Supabase TOTP mode is enabled, include the current Supabase refresh token in the request body.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MfaSetupRequest' },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/MfaSetupResponse' },
            'MFA setup created.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
        },
      },
    },
    '/auth/mfa/enable': {
      post: {
        tags: ['Auth'],
        summary: 'Enable MFA for the authenticated privileged account',
        description:
          'Enables MFA with the supplied TOTP code. When Supabase TOTP mode is enabled, include the current Supabase refresh token in the request body and the response may include an upgraded Supabase session bundle.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MfaCodeRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'MFA enabled.',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/MessageResponse' },
                    { $ref: '#/components/schemas/AuthResponse' },
                  ],
                },
              },
            },
          },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '409': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'MFA setup must be created before enabling MFA.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/auth/mfa/disable': {
      post: {
        tags: ['Auth'],
        summary: 'Disable MFA for the authenticated privileged account',
        description:
          'Disables MFA with the supplied TOTP code. When Supabase TOTP mode is enabled, include the current Supabase refresh token in the request body.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MfaCodeRequest' },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/MessageResponse' },
            'MFA disabled. Current sessions were revoked.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '409': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'MFA is not enabled for this account.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and return a new access token pair',
        description:
          'Accepts a valid refresh token for an active server-side auth session, rotates it, and returns a new access token plus replacement refresh token.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
            },
          },
        },
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/AuthResponse' }, 'Refresh succeeded.'),
          '401': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid or expired refresh token.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Return the authenticated user',
        description:
          'Returns the authenticated user for a valid JWT backed by an active server-side auth session. Auth routes bypass API key enforcement.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/AuthUser' }, 'Authenticated user.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'User not found.'),
        },
      },
    },
    '/auth/sessions': {
      get: {
        tags: ['Auth'],
        summary: 'List the authenticated user sessions',
        description:
          "Returns the authenticated user's server-side auth sessions for account security UI, including current-session detection and revocation state.",
        security: [{ BearerAuth: [] }],
        responses: {
          '200': jsonResponse(
            {
              type: 'array',
              items: { $ref: '#/components/schemas/AuthSessionSummary' },
            },
            'Authenticated user sessions.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke the current auth session',
        description:
          'Revokes the current server-side auth session so the presented bearer token cannot be used again.',
        security: [{ BearerAuth: [] }],
        responses: {
          '204': { description: 'Logout succeeded and the current session was revoked.' },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
        },
      },
    },
    '/auth/sessions/{id}': {
      delete: {
        tags: ['Auth'],
        summary: 'Revoke one authenticated user session',
        description:
          'Revokes one server-side auth session owned by the authenticated user. Intended for device/session management UI.',
        security: [{ BearerAuth: [] }],
        parameters: [idParameter],
        responses: {
          '204': { description: 'Session revoked.' },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Session not found.'),
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users for admin dashboard',
        description:
          'Available to SYSTEM_ADMIN and DEPARTMENT_MANAGER users. Returns the standard user list response used by dashboard administration screens.',
        security: apiKeyAndBearerSecurity,
        parameters: paginationParameters,
        responses: {
          '200': listResponse('UserSummary'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
        },
      },
    },
    '/audit-logs': {
      get: {
        tags: ['AuditLog'],
        summary: 'List audit logs',
        description:
          'Returns persistent audit records for SYSTEM_ADMIN and AUDITOR users. Supports the standard list query contract, including pagination, search, sorting, timestamp windows, and JSON filter expressions.',
        security: apiKeyAndBearerSecurity,
        parameters: auditLogPaginationParameters,
        responses: {
          '200': {
            ...listResponse('AuditLog'),
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AuditLog' },
                    },
                    { $ref: '#/components/schemas/PaginatedAuditLogList' },
                  ],
                },
                examples: {
                  paginated: paginatedAuditLogListExample,
                },
              },
            },
          },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '422': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid list query parameters.',
          ),
        },
      },
    },
    '/audit-logs/{id}': {
      get: {
        tags: ['AuditLog'],
        summary: 'Get audit log by id',
        description:
          'Returns a single persistent audit log record for SYSTEM_ADMIN and AUDITOR users.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': {
            ...jsonResponse({ $ref: '#/components/schemas/AuditLog' }, 'Audit log found.'),
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuditLog' },
                examples: {
                  auditLog: auditLogExample,
                },
              },
            },
          },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Audit log not found.',
          ),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Required for protected API routes unless the path is explicitly public.',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        required: ['message'],
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNextPage: { type: 'boolean' },
          hasPrevPage: { type: 'boolean' },
        },
        required: ['page', 'pageSize', 'total', 'totalPages', 'hasNextPage', 'hasPrevPage'],
      },
      UserRole: {
        type: 'string',
        description:
          'Application authorization role. Legacy stored values such as SUPER_ADMIN, ADMIN, and VIEWER are normalized at runtime to the current role set.',
        enum: [
          'SYSTEM_ADMIN',
          'DEPARTMENT_MANAGER',
          'SUPERVISOR',
          'DISPATCHER',
          'RESPONDER',
          'CITIZEN_REPORTER',
          'AUDITOR',
        ],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          passwordHash: { type: 'string' },
          role: { $ref: '#/components/schemas/UserRole' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name', 'email', 'passwordHash', 'role'],
      },
      UserSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { $ref: '#/components/schemas/UserRole' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name', 'email', 'role'],
      },
      AuditLog: {
        type: 'object',
        description:
          'Persistent server-side audit record captured for selected authentication and mutating API operations.',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          timestamp: { type: 'string', format: 'date-time' },
          action: { type: 'string' },
          summary: { type: 'string' },
          outcome: { type: 'string', enum: ['success', 'failure'] },
          actorUserId: { type: 'string', format: 'uuid', nullable: true },
          actorEmail: { type: 'string', nullable: true },
          actorRole: {
            allOf: [{ $ref: '#/components/schemas/UserRole' }],
            nullable: true,
          },
          resource: { type: 'string' },
          method: { type: 'string' },
          path: { type: 'string' },
          statusCode: { type: 'integer', nullable: true },
          targetId: { type: 'string', nullable: true },
          ipAddress: { type: 'string', nullable: true },
          userAgent: { type: 'string', nullable: true },
          requestId: { type: 'string', nullable: true },
          metadata: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
        },
        required: [
          'id',
          'createdAt',
          'updatedAt',
          'timestamp',
          'action',
          'summary',
          'outcome',
          'resource',
          'method',
          'path',
        ],
      },
      AuthUser: {
        allOf: [
          { $ref: '#/components/schemas/UserSummary' },
          {
            type: 'object',
            properties: {
              mfaEnabled: { type: 'boolean' },
              mfaEnabledAt: { type: 'string', format: 'date-time', nullable: true },
            },
            required: ['mfaEnabled'],
          },
        ],
      },
      AuthSessionSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
          refreshExpiresAt: { type: 'string', format: 'date-time' },
          refreshUsedAt: { type: 'string', format: 'date-time', nullable: true },
          revokedAt: { type: 'string', format: 'date-time', nullable: true },
          lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
          userAgent: { type: 'string', nullable: true },
          ipAddress: { type: 'string', nullable: true },
          isCurrent: { type: 'boolean' },
        },
        required: [
          'id',
          'createdAt',
          'updatedAt',
          'expiresAt',
          'refreshExpiresAt',
          'refreshUsedAt',
          'revokedAt',
          'lastUsedAt',
          'userAgent',
          'ipAddress',
          'isCurrent',
        ],
      },
      Citizen: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
          contactInfo: { type: 'string' },
          preferredChannel: { type: 'string' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name', 'contactInfo', 'preferredChannel'],
      },
      Agency: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
          contactNumber: { type: 'string', nullable: true },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name'],
      },
      Responder: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
          agencyId: { type: 'string', format: 'uuid' },
          role: { type: 'string' },
          contactInfo: { type: 'string' },
          agency: { $ref: '#/components/schemas/Agency' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name', 'agencyId', 'role', 'contactInfo'],
      },
      Status: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name'],
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
          subCategory: { type: 'string', nullable: true },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name'],
      },
      Severity: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          level: { type: 'string' },
          definition: { type: 'string', nullable: true },
        },
        required: ['id', 'createdAt', 'updatedAt', 'level'],
      },
      CitizenIncident: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          description: { type: 'string' },
          mediaUrl: { type: 'string', nullable: true },
          mediaUrls: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Ordered list of incident media URLs. `mediaUrl` remains the first item for backward compatibility.',
          },
          dateReported: { type: 'string', format: 'date-time' },
          latitude: { type: 'number', format: 'double', nullable: true },
          longitude: { type: 'number', format: 'double', nullable: true },
          addressLine1: { type: 'string', nullable: true },
          addressLine2: { type: 'string', nullable: true },
          barangay: { type: 'string', nullable: true },
          districtName: { type: 'string', nullable: true },
          cityName: { type: 'string', nullable: true },
          provinceName: { type: 'string', nullable: true },
          regionName: { type: 'string', nullable: true },
          postalCode: { type: 'string', nullable: true },
          landmark: { type: 'string', nullable: true },
          statusId: { type: 'string', format: 'uuid' },
          citizenId: { type: 'string', format: 'uuid' },
          categoryId: { type: 'string', format: 'uuid' },
          severityId: { type: 'string', format: 'uuid' },
        },
        required: [
          'id',
          'createdAt',
          'updatedAt',
          'description',
          'dateReported',
          'statusId',
          'citizenId',
          'categoryId',
          'severityId',
        ],
      },
      Assignment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          incidentId: { type: 'string', format: 'uuid' },
          responderId: { type: 'string', format: 'uuid' },
          assignedDate: { type: 'string', format: 'date-time' },
          responseStart: { type: 'string', format: 'date-time', nullable: true },
          responseEnd: { type: 'string', format: 'date-time', nullable: true },
          outcome: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
        },
        required: ['id', 'createdAt', 'updatedAt', 'incidentId', 'responderId', 'assignedDate'],
      },
      UserCapabilities: {
        type: 'object',
        description:
          'Dashboard-oriented capability payload derived from the authenticated user role profile. Permission keys are normalized, scoped, and intended for frontend feature gating.',
        properties: {
          role: { $ref: '#/components/schemas/UserRole' },
          label: {
            type: 'string',
            description: 'Human-readable role label for dashboard rendering.',
          },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Normalized scoped permission keys exposed to clients for feature gating, for example `incident:read:department` or `audit:export:global`.',
          },
          scope: {
            type: 'string',
            enum: ['own', 'team', 'department', 'region', 'global'],
            description: 'Highest operational scope granted by the role.',
          },
          canUpdateUser: {
            type: 'boolean',
            description:
              'Convenience flag for dashboard user-edit affordances. True when the role has `user:update:department` or `user:manage:global`.',
          },
          canDeleteUser: {
            type: 'boolean',
            description:
              'Convenience flag for dashboard destructive user actions. True only when the role has `user:manage:global`.',
          },
        },
        required: ['role', 'label', 'permissions', 'scope', 'canUpdateUser', 'canDeleteUser'],
      },
      RegisterRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 12 },
        },
        required: ['name', 'email', 'password'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          mfaCode: {
            type: 'string',
            description:
              'Required when the user has MFA enabled and belongs to a privileged role. In Supabase TOTP mode this is verified against Supabase MFA factors.',
          },
        },
        required: ['email', 'password'],
      },
      MfaSetupRequest: {
        type: 'object',
        properties: {
          refreshToken: {
            type: 'string',
            description:
              'Required when Supabase TOTP mode is enabled so the backend can create a session-scoped MFA enrollment with Supabase.',
          },
        },
      },
      PasswordResetRequestRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
        required: ['email'],
      },
      PasswordResetRequestResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          resetToken: {
            type: 'string',
            nullable: true,
            description:
              'Returned only in non-production environments for local development and testing.',
          },
          resetExpiresAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description:
              'Returned only in non-production environments for local development and testing.',
          },
        },
        required: ['message'],
      },
      PasswordResetConfirmRequest: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          password: { type: 'string', minLength: 12 },
        },
        required: ['token', 'password'],
      },
      MfaCodeRequest: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          refreshToken: {
            type: 'string',
            description:
              'Required when Supabase TOTP mode is enabled so the backend can create a session-scoped MFA challenge against Supabase.',
          },
        },
        required: ['code'],
      },
      MfaSetupResponse: {
        type: 'object',
        properties: {
          factorId: { type: 'string' },
          secret: { type: 'string' },
          otpauthUrl: { type: 'string' },
          qrCode: {
            type: 'string',
            description:
              'Inline SVG data URL returned by Supabase when Supabase TOTP mode is enabled.',
          },
          issuer: { type: 'string' },
          accountName: { type: 'string', format: 'email' },
        },
        required: ['secret', 'otpauthUrl', 'issuer', 'accountName'],
      },
      MessageResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
        required: ['message'],
      },
      RefreshRequest: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' },
        },
        required: ['refreshToken'],
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          refreshToken: { type: 'string' },
          tokenType: { type: 'string', example: 'Bearer' },
          sessionId: { type: 'string', format: 'uuid' },
          expiresAt: { type: 'string', format: 'date-time' },
          refreshExpiresAt: { type: 'string', format: 'date-time' },
          mfaRequired: {
            type: 'boolean',
            description:
              'Returned on failed login when the account requires MFA and no valid MFA code was supplied.',
          },
          user: { $ref: '#/components/schemas/AuthUser' },
        },
        required: [
          'token',
          'refreshToken',
          'tokenType',
          'sessionId',
          'expiresAt',
          'refreshExpiresAt',
          'user',
        ],
      },
      CreateCitizenRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          contactInfo: { type: 'string' },
          preferredChannel: { type: 'string' },
        },
        required: ['name', 'contactInfo', 'preferredChannel'],
      },
      UpdateCitizenRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          contactInfo: { type: 'string' },
          preferredChannel: { type: 'string' },
        },
      },
      LinkMyCitizenProfileRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          preferredChannel: { type: 'string' },
        },
      },
      CreateAgencyRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          contactNumber: { type: 'string' },
        },
        required: ['name'],
      },
      UpdateAgencyRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          contactNumber: { type: 'string', nullable: true },
        },
      },
      CreateResponderRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          agencyId: { type: 'string', format: 'uuid' },
          role: { type: 'string' },
          contactInfo: { type: 'string' },
        },
        required: ['name', 'agencyId', 'role', 'contactInfo'],
      },
      UpdateResponderRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          agencyId: { type: 'string', format: 'uuid' },
          role: { type: 'string' },
          contactInfo: { type: 'string' },
        },
      },
      CreateStatusRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
      UpdateStatusRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      CreateCategoryRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          subCategory: { type: 'string' },
        },
        required: ['name'],
      },
      UpdateCategoryRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          subCategory: { type: 'string', nullable: true },
        },
      },
      CreateSeverityRequest: {
        type: 'object',
        properties: {
          level: { type: 'string' },
          definition: { type: 'string' },
        },
        required: ['level'],
      },
      UpdateSeverityRequest: {
        type: 'object',
        properties: {
          level: { type: 'string' },
          definition: { type: 'string', nullable: true },
        },
      },
      CreateIncidentRequest: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          mediaUrl: {
            type: 'string',
            description:
              'Public URL for previously uploaded incident media. Use POST /incidents/media/upload to generate this value from a base64 payload.',
          },
          mediaUrls: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Ordered list of uploaded media URLs for this incident. When both `mediaUrl` and `mediaUrls` are sent, the legacy `mediaUrl` is prepended if it is not already present.',
          },
          dateReported: { type: 'string', format: 'date-time' },
          latitude: { type: 'number', format: 'double' },
          longitude: { type: 'number', format: 'double' },
          addressLine1: { type: 'string' },
          addressLine2: { type: 'string' },
          barangay: { type: 'string' },
          districtName: { type: 'string' },
          cityName: { type: 'string' },
          provinceName: { type: 'string' },
          regionName: { type: 'string' },
          postalCode: { type: 'string' },
          landmark: { type: 'string' },
          statusId: { type: 'string', format: 'uuid' },
          citizenId: { type: 'string', format: 'uuid' },
          categoryId: { type: 'string', format: 'uuid' },
          severityId: { type: 'string', format: 'uuid' },
        },
        required: ['description', 'statusId', 'citizenId', 'categoryId', 'severityId'],
        description: 'Incident creation requires a full coordinate/address snapshot payload.',
      },
      CreateCitizenIncidentReportRequest: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          mediaUrl: {
            type: 'string',
            description:
              'Public URL for previously uploaded incident media. Use POST /incidents/media/upload to generate this value from a base64 payload.',
          },
          mediaUrls: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Ordered list of uploaded media URLs for this incident. When both `mediaUrl` and `mediaUrls` are sent, the legacy `mediaUrl` is prepended if it is not already present.',
          },
          dateReported: { type: 'string', format: 'date-time' },
          latitude: { type: 'number', format: 'double' },
          longitude: { type: 'number', format: 'double' },
          addressLine1: { type: 'string' },
          addressLine2: { type: 'string' },
          barangay: { type: 'string' },
          districtName: { type: 'string' },
          cityName: { type: 'string' },
          provinceName: { type: 'string' },
          regionName: { type: 'string' },
          postalCode: { type: 'string' },
          landmark: { type: 'string' },
          categoryId: { type: 'string', format: 'uuid' },
          severityId: { type: 'string', format: 'uuid' },
        },
        required: ['description', 'categoryId', 'severityId'],
        description:
          'Incident report creation requires a full coordinate/address snapshot payload.',
      },
      UpdateIncidentRequest: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          mediaUrl: {
            type: 'string',
            description:
              'Public URL for previously uploaded incident media. Use POST /incidents/media/upload to generate this value from a base64 payload.',
          },
          mediaUrls: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Ordered list of uploaded media URLs for this incident. When both `mediaUrl` and `mediaUrls` are sent, the legacy `mediaUrl` is prepended if it is not already present.',
          },
          dateReported: { type: 'string', format: 'date-time' },
          latitude: { type: 'number', format: 'double' },
          longitude: { type: 'number', format: 'double' },
          addressLine1: { type: 'string' },
          addressLine2: { type: 'string' },
          barangay: { type: 'string' },
          districtName: { type: 'string' },
          cityName: { type: 'string' },
          provinceName: { type: 'string' },
          regionName: { type: 'string' },
          postalCode: { type: 'string' },
          landmark: { type: 'string' },
          statusId: { type: 'string', format: 'uuid' },
          citizenId: { type: 'string', format: 'uuid' },
          categoryId: { type: 'string', format: 'uuid' },
          severityId: { type: 'string', format: 'uuid' },
        },
        description:
          'Incident updates may modify snapshot fields directly; there is no location lookup resource.',
      },
      UploadIncidentMediaRequest: {
        type: 'object',
        properties: {
          fileName: { type: 'string' },
          contentType: {
            type: 'string',
            description: 'MIME type of the uploaded file, for example image/jpeg.',
          },
          dataBase64: {
            type: 'string',
            description:
              'Base64-encoded file contents. A full data URL is also accepted and will be normalized server-side.',
          },
          incidentId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description:
              'Optional incident identifier used only to organize the storage object path.',
          },
          files: {
            type: 'array',
            items: { $ref: '#/components/schemas/UploadIncidentMediaItem' },
            description:
              'Optional multi-file upload payload. Use this when uploading several files for the same incident in one request.',
          },
        },
        description:
          'Provide either the single-file fields (`fileName`, `contentType`, `dataBase64`) or a `files` array.',
      },
      UploadIncidentMediaItem: {
        type: 'object',
        properties: {
          fileName: { type: 'string' },
          contentType: { type: 'string' },
          dataBase64: { type: 'string' },
        },
        required: ['fileName', 'contentType', 'dataBase64'],
      },
      UploadIncidentMediaResponse: {
        type: 'object',
        properties: {
          mediaUrls: {
            type: 'array',
            items: { type: 'string' },
          },
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                bucket: { type: 'string' },
                objectPath: { type: 'string' },
                mediaUrl: { type: 'string' },
                contentType: { type: 'string' },
                fileName: { type: 'string' },
                size: { type: 'integer' },
              },
              required: ['bucket', 'objectPath', 'mediaUrl', 'contentType', 'fileName', 'size'],
            },
          },
        },
        required: ['mediaUrls', 'files'],
      },
      CreateAssignmentRequest: {
        type: 'object',
        properties: {
          incidentId: { type: 'string', format: 'uuid' },
          responderId: { type: 'string', format: 'uuid' },
          assignedDate: { type: 'string', format: 'date-time' },
          responseStart: { type: 'string', format: 'date-time' },
          responseEnd: { type: 'string', format: 'date-time' },
          outcome: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['incidentId', 'responderId'],
      },
      UpdateAssignmentRequest: {
        type: 'object',
        properties: {
          incidentId: { type: 'string', format: 'uuid' },
          responderId: { type: 'string', format: 'uuid' },
          assignedDate: { type: 'string', format: 'date-time' },
          responseStart: { type: 'string', format: 'date-time' },
          responseEnd: { type: 'string', format: 'date-time' },
          outcome: { type: 'string' },
          notes: { type: 'string' },
        },
      },
      CreateUserRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 12 },
          role: { $ref: '#/components/schemas/UserRole' },
        },
        required: ['name', 'email', 'password'],
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 12 },
          role: { $ref: '#/components/schemas/UserRole' },
        },
      },
      PaginatedCitizenList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Citizen' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      PaginatedAgencyList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Agency' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      PaginatedResponderList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Responder' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      PaginatedStatusList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Status' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      PaginatedCategoryList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      PaginatedSeverityList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Severity' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      PaginatedCitizenIncidentList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/CitizenIncident' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      PaginatedAssignmentList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Assignment' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      PaginatedUserSummaryList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/UserSummary' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      PaginatedAuditLogList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
    },
  },
};
