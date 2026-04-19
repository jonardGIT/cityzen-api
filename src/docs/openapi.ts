import { OpenAPIV3 } from 'openapi-types';
import { getFeatureSelection, type FeatureSelection } from '../featureSelection.js';

const CONDITIONAL_MFA_PATHS = ['/auth/mfa/setup', '/auth/mfa/enable', '/auth/mfa/disable'] as const;
const CONDITIONAL_SESSION_PATHS = ['/auth/sessions', '/auth/sessions/{id}'] as const;
const CONDITIONAL_MEDIA_PATHS = ['/incidents/media/upload'] as const;
const CONDITIONAL_RESTORE_PATHS = [
  '/citizens/{id}/restore',
  '/regions/{id}/restore',
  '/provinces/{id}/restore',
  '/cities-municipalities/{id}/restore',
  '/barangays/{id}/restore',
  '/agencies/{id}/restore',
  '/responders/{id}/restore',
  '/statuses/{id}/restore',
  '/categories/{id}/restore',
  '/severities/{id}/restore',
  '/incidents/{id}/restore',
  '/assignments/{id}/restore',
  '/users/{id}/restore',
  '/mobile-content/{id}/restore',
] as const;
const HARD_DELETE_PATH_METADATA = {
  '/citizens/{id}': { summary: 'Delete citizen', responseDescription: 'Citizen deleted.' },
  '/regions/{id}': { summary: 'Delete region', responseDescription: 'Region deleted.' },
  '/provinces/{id}': { summary: 'Delete province', responseDescription: 'Province deleted.' },
  '/cities-municipalities/{id}': {
    summary: 'Delete city or municipality',
    responseDescription: 'City or municipality deleted.',
  },
  '/barangays/{id}': { summary: 'Delete barangay', responseDescription: 'Barangay deleted.' },
  '/agencies/{id}': { summary: 'Delete agency', responseDescription: 'Agency deleted.' },
  '/responders/{id}': { summary: 'Delete responder', responseDescription: 'Responder deleted.' },
  '/statuses/{id}': { summary: 'Delete status', responseDescription: 'Status deleted.' },
  '/categories/{id}': { summary: 'Delete category', responseDescription: 'Category deleted.' },
  '/severities/{id}': { summary: 'Delete severity', responseDescription: 'Severity deleted.' },
  '/incidents/{id}': { summary: 'Delete incident', responseDescription: 'Incident deleted.' },
  '/assignments/{id}': { summary: 'Delete assignment', responseDescription: 'Assignment deleted.' },
  '/users/{id}': { summary: 'Delete user', responseDescription: 'User deleted.' },
  '/mobile-content/{id}': {
    summary: 'Delete mobile app content',
    responseDescription: 'Mobile app content deleted.',
  },
} as const;
const ARCHIVE_QUERY_PARAMETER_NAMES = new Set(['includeArchived', 'archivedOnly']);

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
    actorRole: 'NATIONAL_ADMIN',
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

const nationalAdminCapabilitiesExample: OpenAPIV3.ExampleObject = {
  summary: 'National admin capabilities',
  value: {
    role: 'NATIONAL_ADMIN',
    label: 'National Admin',
    permissions: [
      'user:manage:global',
      'role:manage:global',
      'settings:manage:global',
      'incident:manage:global',
      'audit:read:global',
      'audit:export:global',
      'geo:manage:global',
      'escalation:manage:global',
    ],
    scope: 'national',
    canUpdateUser: true,
    canDeleteUser: true,
  },
};

const cityAdminCapabilitiesExample: OpenAPIV3.ExampleObject = {
  summary: 'City/Municipal admin capabilities',
  value: {
    role: 'CITY_ADMIN',
    label: 'City/Municipal Admin',
    permissions: [
      'user:create:city',
      'user:read:city',
      'user:update:city',
      'user:reset_password:city',
      'geo:manage:city',
      'reference:manage:city',
      'incident:read:city',
      'agency:manage:city',
      'escalation:create:city',
    ],
    scope: 'city',
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
const bearerSecurity: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];
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

function getRegisterOperationDescription(selection: FeatureSelection): string {
  if (selection.tokenMode === 'supabase-jwt') {
    return 'Creates a self-service account with the default role CITIZEN_REPORTER. In Supabase JWT mode, registration returns a session bundle only when immediate sign-in succeeds; otherwise the API returns 201 with emailConfirmationRequired=true and no token fields until the user confirms their email.';
  }

  return 'Creates a self-service account with the default role CITIZEN_REPORTER and immediately returns access and refresh tokens.';
}

function getRegisterCreatedResponse(selection: FeatureSelection): OpenAPIV3.ResponseObject {
  if (selection.tokenMode === 'supabase-jwt') {
    return jsonResponse(
      {
        oneOf: [
          { $ref: '#/components/schemas/AuthResponse' },
          { $ref: '#/components/schemas/RegisterEmailConfirmationRequiredResponse' },
        ],
      },
      'Registration succeeded. In Supabase JWT mode, the response either returns a session bundle or indicates that email confirmation is required before sign-in.',
    );
  }

  return jsonResponse(
    { $ref: '#/components/schemas/AuthResponse' },
    'Registration succeeded and returned access and refresh tokens.',
  );
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

function filterArchiveQueryParameters(
  operation: OpenAPIV3.OperationObject | undefined,
): OpenAPIV3.OperationObject | undefined {
  if (!operation?.parameters) {
    return operation;
  }

  return {
    ...operation,
    parameters: operation.parameters.filter((parameter) => {
      if ('$ref' in parameter) {
        return true;
      }

      return !ARCHIVE_QUERY_PARAMETER_NAMES.has(parameter.name);
    }),
  };
}

function createFeatureAwarePaths(
  paths: OpenAPIV3.PathsObject,
  selection: FeatureSelection,
): OpenAPIV3.PathsObject {
  const nextPaths: OpenAPIV3.PathsObject = Object.fromEntries(
    Object.entries(paths).map(([path, pathItem]) => [path, { ...pathItem }]),
  );

  if (!selection.mediaStorage || selection.mediaStorage === 'disabled') {
    for (const path of CONDITIONAL_MEDIA_PATHS) {
      delete nextPaths[path];
    }
  }

  if (selection.mfaMode === 'disabled') {
    for (const path of CONDITIONAL_MFA_PATHS) {
      delete nextPaths[path];
    }
  }

  if (selection.tokenMode !== 'app-jwt') {
    for (const path of CONDITIONAL_SESSION_PATHS) {
      delete nextPaths[path];
    }
  }

  const registerPathItem = nextPaths['/auth/register'];
  if (registerPathItem?.post) {
    registerPathItem.post = {
      ...registerPathItem.post,
      description: getRegisterOperationDescription(selection),
      responses: {
        ...registerPathItem.post.responses,
        '201': getRegisterCreatedResponse(selection),
      },
    };
  }

  if (selection.recordDeletion !== 'archive') {
    for (const path of CONDITIONAL_RESTORE_PATHS) {
      delete nextPaths[path];
    }

    for (const [path, pathItem] of Object.entries(nextPaths)) {
      if (!pathItem) {
        continue;
      }

      nextPaths[path] = {
        ...pathItem,
        get: filterArchiveQueryParameters(pathItem.get),
      };
    }

    for (const [path, metadata] of Object.entries(HARD_DELETE_PATH_METADATA)) {
      const pathItem = nextPaths[path];
      if (!pathItem?.delete) {
        continue;
      }

      pathItem.delete = {
        ...pathItem.delete,
        summary: metadata.summary,
        responses: {
          ...pathItem.delete.responses,
          '204': { description: metadata.responseDescription },
        },
      };
    }
  }

  return nextPaths;
}

export function createOpenApiDocument(
  selection: FeatureSelection = getFeatureSelection(),
): OpenAPIV3.Document {
  return {
    ...baseOpenApiDocument,
    paths: createFeatureAwarePaths(baseOpenApiDocument.paths, selection),
  };
}

const baseOpenApiDocument: OpenAPIV3.Document = {
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
    {
      name: 'Region',
      description:
        'Philippine region reference data. Writes are limited to NATIONAL_ADMIN and REGIONAL_DIRECTOR.',
    },
    {
      name: 'Province',
      description:
        'Province reference data under a region. Writes are limited to NATIONAL_ADMIN and REGIONAL_DIRECTOR.',
    },
    {
      name: 'CityMunicipality',
      description:
        "City and municipality reference data. PROVINCIAL_ADMIN writes are limited to records inside the actor's province.",
    },
    {
      name: 'Barangay',
      description:
        "Barangay reference data. PROVINCIAL_ADMIN writes are limited to the actor's province and CITY_ADMIN writes are limited to the actor's city.",
    },
    { name: 'Agency' },
    { name: 'Responder' },
    { name: 'Status' },
    { name: 'Category' },
    { name: 'Severity' },
    { name: 'Incident' },
    { name: 'Assignment' },
    { name: 'User' },
    { name: 'Mobile' },
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
    ...resourcePath(
      'regions',
      'Region',
      'CreateRegionRequest',
      'UpdateRegionRequest',
      apiKeyAndBearerSecurity,
      apiKeyAndBearerSecurity,
    ),
    ...resourcePath(
      'provinces',
      'Province',
      'CreateProvinceRequest',
      'UpdateProvinceRequest',
      apiKeyAndBearerSecurity,
      apiKeyAndBearerSecurity,
    ),
    ...resourcePath(
      'cities-municipalities',
      'CityMunicipality',
      'CreateCityMunicipalityRequest',
      'UpdateCityMunicipalityRequest',
      apiKeyAndBearerSecurity,
      apiKeyAndBearerSecurity,
    ),
    ...resourcePath(
      'barangays',
      'Barangay',
      'CreateBarangayRequest',
      'UpdateBarangayRequest',
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
    '/incidents/audit': {
      get: {
        tags: ['Incident'],
        summary: 'List auditor-safe incidents',
        description:
          'Returns the redacted incident list available only to AUDITOR users. This surface excludes internal incident details such as description, citizen identifiers, exact location fields, and media URLs while preserving status, classification, coarse locality, and aggregate counts.',
        security: apiKeyAndBearerSecurity,
        parameters: paginationParameters,
        responses: {
          '200': listResponse('AuditorIncident'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '422': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid list query parameters.',
          ),
        },
      },
    },
    '/incidents/media/upload': {
      post: {
        tags: ['Incident'],
        summary: 'Upload incident media to Supabase Storage',
        description:
          'Accepts either one base64-encoded file or a `files` array and returns reusable media references for incident persistence. In `public` storage mode these are public URLs; in `signed` mode the response also includes short-lived access URLs for preview while the persisted values remain stable managed references. When a media scan webhook is configured, the upload completes only after the object is successfully submitted for downstream scanning.',
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
            'Supabase Storage is disabled, misconfigured, or downstream media scanning is unavailable.',
          ),
        },
      },
    },
    '/incidents/{id}/media/{mediaId}': {
      get: {
        tags: ['Incident'],
        summary: 'Resolve an authorized access URL for stored incident media',
        description:
          'Returns a just-in-time access URL for a stored incident media file after applying the same incident-level authorization rules as GET /incidents/{id}. This supports backend-gated evidence retrieval without changing the persisted media reference.',
        security: apiKeyAndBearerSecurity,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'mediaId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/IncidentMediaAccessResponse' },
            'Incident media access URL resolved.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Incident or incident media not found.',
          ),
          '422': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Missing linked citizen profile.',
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
            { $ref: '#/components/schemas/CitizenIncidentReportResponse' },
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
    '/cases/{caseToken}': {
      get: {
        tags: ['Incident'],
        summary: 'Look up a public case status by raw case token',
        description:
          'Public Tuguegarao Phase 1 case lookup. Returns only citizen-safe status, location summary, and timeline fields. Exact addresses, coordinates, media URLs, citizen identifiers, responder identities, and internal notes are intentionally excluded.',
        security: [],
        parameters: [
          {
            name: 'caseToken',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/PublicCaseLookupResponse' },
            'Public case found.',
          ),
          '400': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid case token format.',
          ),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Case token is invalid, expired, revoked, or not found.',
          ),
          '429': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Too many requests.'),
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
    '/incidents/audit/{id}': {
      get: {
        tags: ['Incident'],
        summary: 'Get auditor-safe incident by id',
        description:
          'Returns the redacted incident detail available only to AUDITOR users. This route remains separate from the internal incident detail route and does not expose description, citizenId, exact location fields, or media URLs.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/AuditorIncident' },
            'Auditor incident found.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Incident not found.',
          ),
        },
      },
    },
    '/incidents/{id}/timeline': {
      get: {
        tags: ['Incident'],
        summary: 'Get the internal incident status timeline',
        description:
          'Returns the authenticated internal status timeline for an incident, including optional notes and the user who made each status transition.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/IncidentTimelineResponse' },
            'Incident timeline found.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Incident not found.',
          ),
        },
      },
    },
    '/incidents/audit/{id}/timeline': {
      get: {
        tags: ['Incident'],
        summary: 'Get the auditor-safe incident status timeline',
        description:
          'Returns the redacted incident timeline available only to AUDITOR users. This auditor route stays separate from the internal timeline route and exposes only the timeline id, changedAt, fromStatus, and toStatus fields.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/AuditorIncidentTimelineResponse' },
            'Auditor incident timeline found.',
          ),
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
          'Available to assignment-management roles only: NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_ADMIN, and DISPATCHER.',
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
          'Available to assignment-management roles only: NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_ADMIN, and DISPATCHER.',
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
          'Available to assignment-management roles only: NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_ADMIN, and DISPATCHER.',
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
          'Available to assignment-management roles only: NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_ADMIN, and DISPATCHER.',
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
          'Available to assignment-management roles only: NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_ADMIN, and DISPATCHER.',
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
          'Available to assignment-management roles only: NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_ADMIN, and DISPATCHER. Restore requires both the linked incident and responder to already be active.',
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
          'Returns the authenticated user role, label, scope, permission list, and dashboard-friendly booleans. This endpoint is available to any authenticated user, not only admin roles. `canUpdateUser` maps to the current user-management permissions: `user:update:city`, `user:manage:province`, `user:manage:region`, or `user:manage:global`. `canDeleteUser` maps to `user:manage:global` only.',
        security: apiKeyAndBearerSecurity,
        responses: {
          '200': {
            description: 'Role capability metadata.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserCapabilities' },
                examples: {
                  nationalAdmin: nationalAdminCapabilitiesExample,
                  cityAdmin: cityAdminCapabilitiesExample,
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
          'Available to LGU admin roles. NATIONAL_ADMIN receives the full inventory, while REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, and CITY_ADMIN receive only self plus manageable users inside their jurisdiction scope.',
        security: apiKeyAndBearerSecurity,
        parameters: paginationParameters,
        responses: {
          '200': listResponse('UserSummary'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
      post: {
        tags: ['User'],
        summary: 'Create user',
        description:
          "Available to LGU admin roles only: NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, and CITY_ADMIN. The backend rejects creation of target roles outside the caller's manageable set.",
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
        description:
          'Available to LGU admin roles. NATIONAL_ADMIN can read any user, while scoped admins can read only self plus manageable users inside their jurisdiction scope.',
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
          'Available to LGU admin roles only: NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, and CITY_ADMIN. The backend enforces explicit target-role management rules rather than a generic role hierarchy.',
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
          'Available to LGU admin roles only: NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, and CITY_ADMIN. The backend enforces both manageable-role rules and jurisdiction scope, so scoped admins can archive only users inside their own region, province, or city.',
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
          'Available to LGU admin roles only: NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, and CITY_ADMIN when archive mode is enabled. The backend enforces both manageable-role rules and jurisdiction scope on archived user restoration.',
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
          'Creates a self-service account with the default role CITIZEN_REPORTER. The 201 response shape depends on the active token mode.',
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
            {
              oneOf: [
                { $ref: '#/components/schemas/AuthResponse' },
                { $ref: '#/components/schemas/RegisterEmailConfirmationRequiredResponse' },
              ],
            },
            'Registration succeeded. Depending on the active token mode and sign-in outcome, the response may either return a session bundle or require email confirmation before sign-in.',
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
            { $ref: '#/components/schemas/LoginDeniedResponse' },
            'Login denied due to invalid credentials or because MFA is required and no valid MFA code was supplied.',
          ),
          '429': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Too many login attempts. Retry after the backoff window indicated by the rate-limit headers.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/auth/mobile/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a citizen reporter account with a mobile number',
        description:
          'Creates a local-app citizen reporter account tied to a normalized Philippine mobile number and returns the standard JWT session bundle. This route is available only when local app auth and app JWT sessions are enabled.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MobileRegisterRequest' },
            },
          },
        },
        responses: {
          '201': jsonResponse(
            { $ref: '#/components/schemas/AuthResponse' },
            'Mobile registration succeeded.',
          ),
          '409': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Mobile number already registered.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
          '429': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Too many mobile registration attempts. Retry after the rate-limit window.',
          ),
          '501': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Mobile auth is unavailable for the active auth/session configuration.',
          ),
        },
      },
    },
    '/auth/mobile/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate a citizen reporter with mobile number and password',
        description:
          'Authenticates a CITIZEN_REPORTER account by normalized Philippine mobile number and returns the standard JWT session bundle. This route is available only when local app auth and app JWT sessions are enabled.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MobileLoginRequest' },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/AuthResponse' },
            'Mobile authentication succeeded.',
          ),
          '401': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid mobile number or password.',
          ),
          '403': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Mobile auth is only available for citizen accounts.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
          '429': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Too many mobile login attempts. Retry after the rate-limit window.',
          ),
          '501': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Mobile auth is unavailable for the active auth/session configuration.',
          ),
        },
      },
    },
    '/mobile/content': {
      get: {
        tags: ['Mobile'],
        summary: 'List published mobile app content',
        description:
          'Public mobile content feed. Returns only active, published content whose publish window is open, filtered by optional placement and restricted to generic content with a null audience.',
        security: [],
        parameters: [
          {
            name: 'placement',
            in: 'query',
            required: false,
            description: 'Optional placement filter, for example `home`.',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': jsonResponse(
            {
              type: 'array',
              items: { $ref: '#/components/schemas/MobilePublishedContent' },
            },
            'Published mobile content list.',
          ),
          '400': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid placement filter.',
          ),
        },
      },
    },
    '/mobile/profile': {
      get: {
        tags: ['Mobile'],
        summary: 'Get the authenticated citizen reporter profile',
        description:
          'Returns the citizen profile linked to the authenticated CITIZEN_REPORTER account.',
        security: bearerSecurity,
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/Citizen' }, 'Citizen profile found.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Citizen profile not found for authenticated user.',
          ),
          '409': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Citizen link state is ambiguous or conflicting.',
          ),
        },
      },
      patch: {
        tags: ['Mobile'],
        summary: 'Create or update the authenticated citizen reporter profile',
        description:
          'Creates the linked citizen profile on first use or updates the existing one for the authenticated CITIZEN_REPORTER account.',
        security: bearerSecurity,
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
          '409': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Citizen link state is ambiguous or conflicting.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/mobile/incidents': {
      get: {
        tags: ['Mobile'],
        summary: 'List the authenticated citizen reporter incidents',
        description:
          'Returns only incidents visible to the authenticated CITIZEN_REPORTER, with the same list and pagination behavior as the internal incident list endpoint.',
        security: bearerSecurity,
        parameters: paginationParameters,
        responses: {
          '200': listResponse('CitizenIncident'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '422': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid list query parameters or missing linked citizen profile.',
          ),
        },
      },
    },
    '/mobile/incidents/{id}': {
      get: {
        tags: ['Mobile'],
        summary: 'Get a citizen-visible incident by id',
        description:
          'Returns a single incident only when it is visible to the authenticated CITIZEN_REPORTER.',
        security: bearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/CitizenIncident' }, 'Incident found.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Incident not found.',
          ),
        },
      },
    },
    '/mobile/incidents/{id}/timeline': {
      get: {
        tags: ['Mobile'],
        summary: 'Get the citizen-safe incident timeline',
        description:
          'Returns the citizen-safe timeline for an incident visible to the authenticated CITIZEN_REPORTER.',
        security: bearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/MobileIncidentTimelineResponse' },
            'Citizen-safe incident timeline found.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Incident not found.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/mobile/incidents/report': {
      post: {
        tags: ['Mobile'],
        summary: 'Create an incident report from the mobile citizen flow',
        description:
          'Creates an incident for the authenticated CITIZEN_REPORTER. The citizen identity is derived from the authenticated account and linked citizen profile.',
        security: bearerSecurity,
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
            { $ref: '#/components/schemas/CitizenIncidentReportResponse' },
            'Incident report created.',
          ),
          '400': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid input or foreign key reference.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '409': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Citizen link state is ambiguous or conflicting.',
          ),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/mobile-content': {
      get: {
        tags: ['Admin'],
        summary: 'List mobile app content',
        description: 'Admin CRUD surface for mobile app content. Available to admin roles only.',
        security: apiKeyAndBearerSecurity,
        parameters: paginationParameters,
        responses: {
          '200': listResponse('MobileAppContent'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '422': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Invalid list query parameters.',
          ),
        },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create mobile app content',
        description: 'Admin CRUD surface for mobile app content. Available to admin roles only.',
        security: apiKeyAndBearerSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateMobileAppContentRequest' },
            },
          },
        },
        responses: {
          '201': jsonResponse(
            { $ref: '#/components/schemas/MobileAppContent' },
            'Mobile app content created.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
    },
    '/mobile-content/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get mobile app content by id',
        description: 'Admin CRUD surface for mobile app content. Available to admin roles only.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/MobileAppContent' },
            'Mobile app content found.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Not found.'),
        },
      },
      patch: {
        tags: ['Admin'],
        summary: 'Update mobile app content',
        description: 'Admin CRUD surface for mobile app content. Available to admin roles only.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateMobileAppContentRequest' },
            },
          },
        },
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/MobileAppContent' },
            'Mobile app content updated.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Not found.'),
          '422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Archive mobile app content',
        description: 'Admin CRUD surface for mobile app content. Available to admin roles only.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '204': { description: 'Mobile app content archived.' },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Not found.'),
          '409': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Conflict.'),
        },
      },
    },
    '/mobile-content/{id}/restore': {
      post: {
        tags: ['Admin'],
        summary: 'Restore mobile app content',
        description:
          'Admin CRUD surface for mobile app content. Available to admin roles only when archive mode is enabled.',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/MobileAppContent' },
            'Mobile app content restored.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Not found.'),
          '409': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Conflict.'),
        },
      },
    },
    '/auth/password-reset/request': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset token',
        description:
          'Accepts an email address and creates a one-time password reset token when the account exists. The response stays generic to avoid revealing whether the email exists. In non-production environments, the reset token is returned for local testing. In production, raw reset tokens are never returned in the API response and delivery is delegated to the configured backend delivery provider. If production delivery is unavailable, the endpoint fails closed with 503. Privileged accounts require an admin-assisted recovery process instead of self-service reset.',
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
          '503': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Password reset delivery is unavailable.',
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
          'Accepts a valid one-time password reset token plus a new password, then revokes all existing sessions for the user. In production, privileged accounts cannot complete this public self-service reset flow and must follow an admin-assisted recovery process.',
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
          '403': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Privileged account recovery requires an admin-assisted flow.',
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
          'Available to NATIONAL_ADMIN only. Returns the standard user list response used by dashboard administration screens.',
        security: apiKeyAndBearerSecurity,
        parameters: paginationParameters,
        responses: {
          '200': listResponse('UserSummary'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
        },
      },
    },
    '/admin/users/mfa-compliance': {
      get: {
        tags: ['Admin'],
        summary: 'Review privileged MFA compliance',
        description:
          'Available to NATIONAL_ADMIN only. Returns privileged-account MFA enrollment status for operational compliance review.',
        security: apiKeyAndBearerSecurity,
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/PrivilegedMfaComplianceReport' },
            'Privileged MFA compliance report.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
        },
      },
    },
    '/admin/users/access-review': {
      get: {
        tags: ['Admin'],
        summary: 'Review privileged account access posture',
        description:
          'Available to NATIONAL_ADMIN only. Returns privileged-account access-review data including MFA status, active-session counts, last session activity, and stale-account flags for periodic access review procedures.',
        security: apiKeyAndBearerSecurity,
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/PrivilegedAccessReviewReport' },
            'Privileged access review report.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
        },
      },
    },
    '/admin/security/data-governance': {
      get: {
        tags: ['Admin'],
        summary: 'Review admin data governance posture',
        description:
          'Available to admin roles, including NATIONAL_ADMIN, plus AUDITOR. Returns the current governance summary for data classification, retention, operational controls, encryption posture, and legal-hold handling. Non-privileged users are forbidden.',
        security: apiKeyAndBearerSecurity,
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/DataGovernanceReport' },
            'Data governance report.',
          ),
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
          'Returns persistent audit records for NATIONAL_ADMIN and AUDITOR users. Supports the standard list query contract, including pagination, search, sorting, timestamp windows, and JSON filter expressions.',
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
          'Returns a single persistent audit log record for NATIONAL_ADMIN and AUDITOR users.',
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
      LoginDeniedResponse: {
        allOf: [
          { $ref: '#/components/schemas/ErrorResponse' },
          {
            type: 'object',
            properties: {
              mfaRequired: {
                type: 'boolean',
                enum: [true],
                description:
                  'Returned when login is denied because the account requires MFA and no valid MFA code was supplied.',
              },
            },
          },
        ],
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
          'Application authorization role. Legacy stored values such as SYSTEM_ADMIN, DEPARTMENT_MANAGER, SUPERVISOR are normalized at runtime to the current role set.',
        enum: [
          'NATIONAL_ADMIN',
          'REGIONAL_DIRECTOR',
          'PROVINCIAL_ADMIN',
          'CITY_ADMIN',
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
          mobileNumber: { type: 'string', nullable: true },
          mobileNumberVerifiedAt: { type: 'string', format: 'date-time', nullable: true },
          citizenId: { type: 'string', format: 'uuid', nullable: true },
          role: { $ref: '#/components/schemas/UserRole' },
          jurisdictionType: { type: 'string', nullable: true },
          jurisdictionId: { type: 'string', format: 'uuid', nullable: true },
        },
        required: [
          'id',
          'createdAt',
          'updatedAt',
          'name',
          'email',
          'role',
          'jurisdictionType',
          'jurisdictionId',
        ],
      },
      PrivilegedMfaComplianceUser: {
        allOf: [
          { $ref: '#/components/schemas/UserSummary' },
          {
            type: 'object',
            properties: {
              mfaEnabled: { type: 'boolean' },
              mfaEnabledAt: { type: 'string', format: 'date-time', nullable: true },
              requiresMfa: { type: 'boolean' },
              compliant: { type: 'boolean' },
            },
            required: ['mfaEnabled', 'mfaEnabledAt', 'requiresMfa', 'compliant'],
          },
        ],
      },
      PrivilegedMfaComplianceReport: {
        type: 'object',
        properties: {
          summary: {
            type: 'object',
            properties: {
              totalPrivilegedUsers: { type: 'integer' },
              compliantUsers: { type: 'integer' },
              nonCompliantUsers: { type: 'integer' },
            },
            required: ['totalPrivilegedUsers', 'compliantUsers', 'nonCompliantUsers'],
          },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/PrivilegedMfaComplianceUser' },
          },
        },
        required: ['summary', 'data'],
      },
      PrivilegedAccessReviewUser: {
        allOf: [
          { $ref: '#/components/schemas/UserSummary' },
          {
            type: 'object',
            properties: {
              mfaEnabled: { type: 'boolean' },
              mfaEnabledAt: { type: 'string', format: 'date-time', nullable: true },
              requiresMfa: { type: 'boolean' },
              activeSessionCount: { type: 'integer' },
              hasActiveSessions: { type: 'boolean' },
              lastSessionUsedAt: { type: 'string', format: 'date-time', nullable: true },
              latestSessionIpAddress: { type: 'string', nullable: true },
              latestSessionUserAgent: { type: 'string', nullable: true },
              latestSessionBrowserFamily: { type: 'string', nullable: true },
              latestSessionOsFamily: { type: 'string', nullable: true },
              latestSessionDeviceLabel: { type: 'string', nullable: true },
              stale: { type: 'boolean' },
              requiresReview: { type: 'boolean' },
              reviewReasons: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: [
              'mfaEnabled',
              'mfaEnabledAt',
              'requiresMfa',
              'activeSessionCount',
              'hasActiveSessions',
              'lastSessionUsedAt',
              'latestSessionIpAddress',
              'latestSessionUserAgent',
              'latestSessionBrowserFamily',
              'latestSessionOsFamily',
              'latestSessionDeviceLabel',
              'stale',
              'requiresReview',
              'reviewReasons',
            ],
          },
        ],
      },
      PrivilegedAccessReviewReport: {
        type: 'object',
        properties: {
          summary: {
            type: 'object',
            properties: {
              totalPrivilegedUsers: { type: 'integer' },
              usersRequiringReview: { type: 'integer' },
              staleUsers: { type: 'integer' },
              usersWithoutMfa: { type: 'integer' },
              staleAfterDays: { type: 'integer' },
            },
            required: [
              'totalPrivilegedUsers',
              'usersRequiringReview',
              'staleUsers',
              'usersWithoutMfa',
              'staleAfterDays',
            ],
          },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/PrivilegedAccessReviewUser' },
          },
        },
        required: ['summary', 'data'],
      },
      DataGovernanceReport: {
        type: 'object',
        properties: {
          summary: {
            type: 'object',
            properties: {
              legalHoldEnabled: { type: 'boolean' },
              mediaStorageMode: {
                type: 'string',
                enum: ['disabled', 'public', 'signed'],
              },
              tlsRequired: { type: 'boolean' },
              retentionPolicyCount: { type: 'integer' },
            },
            required: [
              'legalHoldEnabled',
              'mediaStorageMode',
              'tlsRequired',
              'retentionPolicyCount',
            ],
          },
          classifications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                domain: { type: 'string' },
                classification: { type: 'string' },
                handling: { type: 'string' },
              },
              required: ['domain', 'classification', 'handling'],
            },
          },
          retentionPolicies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                domain: { type: 'string' },
                retentionDays: { type: 'integer' },
                purgeAuthority: { type: 'string' },
                legalHoldSupported: { type: 'boolean' },
              },
              required: ['domain', 'retentionDays', 'purgeAuthority', 'legalHoldSupported'],
            },
          },
          operationalControls: {
            type: 'object',
            properties: {
              monitoringRunbookDocumented: { type: 'boolean' },
              administrationControlsDocumented: { type: 'boolean' },
              accessGovernanceDocumented: { type: 'boolean' },
              sessionGovernanceDocumented: { type: 'boolean' },
              privilegedAccessReviewEndpoint: { type: 'string' },
              privilegedMfaComplianceEndpoint: { type: 'string' },
              sessionInventoryMode: {
                type: 'string',
                enum: ['app-jwt', 'external-provider'],
              },
              quarterlyReviewRequired: { type: 'boolean' },
            },
            required: [
              'monitoringRunbookDocumented',
              'administrationControlsDocumented',
              'accessGovernanceDocumented',
              'sessionGovernanceDocumented',
              'privilegedAccessReviewEndpoint',
              'privilegedMfaComplianceEndpoint',
              'sessionInventoryMode',
              'quarterlyReviewRequired',
            ],
          },
          encryption: {
            type: 'object',
            properties: {
              transport: { type: 'string' },
              databaseAtRest: { type: 'string' },
              mediaStorage: { type: 'string' },
            },
            required: ['transport', 'databaseAtRest', 'mediaStorage'],
          },
          legalHold: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              contact: { type: 'string', nullable: true },
              procedure: { type: 'string' },
            },
            required: ['enabled', 'contact', 'procedure'],
          },
        },
        required: [
          'summary',
          'classifications',
          'retentionPolicies',
          'operationalControls',
          'encryption',
          'legalHold',
        ],
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
          browserFamily: { type: 'string', nullable: true },
          osFamily: { type: 'string', nullable: true },
          deviceLabel: { type: 'string', nullable: true },
          status: {
            type: 'string',
            enum: ['active', 'expired', 'revoked'],
          },
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
          'browserFamily',
          'osFamily',
          'deviceLabel',
          'status',
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
      Region: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          code: { type: 'string' },
          name: { type: 'string' },
          designation: { type: 'string', nullable: true },
        },
        required: ['id', 'createdAt', 'updatedAt', 'code', 'name', 'designation'],
      },
      Province: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          code: { type: 'string' },
          name: { type: 'string' },
          regionId: { type: 'string', format: 'uuid' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'code', 'name', 'regionId'],
      },
      CityMunicipality: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          code: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['CITY', 'MUNICIPALITY'] },
          provinceId: { type: 'string', format: 'uuid' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'code', 'name', 'type', 'provinceId'],
      },
      Barangay: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          code: { type: 'string' },
          name: { type: 'string' },
          cityMunicipalityId: { type: 'string', format: 'uuid' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'code', 'name', 'cityMunicipalityId'],
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
              'Ordered list of incident media access URLs. `mediaUrl` remains the first item for backward compatibility. When private signed storage mode is enabled, the API resolves persisted managed references into short-lived signed URLs in this response.',
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
      AuditorIncident: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          publicReference: { type: 'string', nullable: true },
          status: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
            required: ['id', 'name'],
          },
          category: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              subCategory: { type: 'string', nullable: true },
            },
            required: ['id', 'name', 'subCategory'],
          },
          severity: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              level: { type: 'string' },
              definition: { type: 'string', nullable: true },
            },
            required: ['id', 'level', 'definition'],
          },
          dateReported: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          barangay: { type: 'string', nullable: true },
          cityName: { type: 'string', nullable: true },
          provinceName: { type: 'string', nullable: true },
          regionName: { type: 'string', nullable: true },
          hasMedia: { type: 'boolean' },
          assignmentCount: { type: 'integer' },
          statusHistoryCount: { type: 'integer' },
        },
        required: [
          'id',
          'publicReference',
          'status',
          'category',
          'severity',
          'dateReported',
          'createdAt',
          'updatedAt',
          'barangay',
          'cityName',
          'provinceName',
          'regionName',
          'hasMedia',
          'assignmentCount',
          'statusHistoryCount',
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
              'Normalized scoped permission keys exposed to clients for feature gating, for example `incident:read:city` or `audit:export:global`. The historical `:city` suffix is retained for compatibility and represents the city-or-municipality LGU tier.',
          },
          scope: {
            type: 'string',
            enum: ['own', 'assigned', 'city', 'province', 'region', 'national', 'global'],
            description:
              'Highest operational scope granted by the role. The `city` value represents the city-or-municipality LGU tier.',
          },
          canUpdateUser: {
            type: 'boolean',
            description:
              'Convenience flag for dashboard user-edit affordances. True when the role has `user:update:city`, `user:manage:province`, `user:manage:region`, or `user:manage:global`.',
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
      RegisterEmailConfirmationRequiredResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          emailConfirmationRequired: {
            type: 'boolean',
            enum: [true],
            description:
              'Returned when registration succeeded but the user must confirm their email before immediate sign-in is allowed.',
          },
          user: { $ref: '#/components/schemas/AuthUser' },
        },
        required: ['message', 'emailConfirmationRequired', 'user'],
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
      MobileRegisterRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          mobileNumber: {
            type: 'string',
            description:
              'Philippine mobile number that the backend normalizes to +63 format before persistence.',
          },
          password: { type: 'string', minLength: 12 },
          preferredChannel: { type: 'string' },
        },
        required: ['name', 'mobileNumber', 'password'],
      },
      MobileLoginRequest: {
        type: 'object',
        properties: {
          mobileNumber: {
            type: 'string',
            description:
              'Philippine mobile number that the backend normalizes to +63 format before lookup.',
          },
          password: { type: 'string' },
        },
        required: ['mobileNumber', 'password'],
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
              'Returned only when the backend is using api-response delivery mode in non-production environments for local testing.',
          },
          resetExpiresAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description:
              'Returned only when resetToken is included for local testing in non-production environments.',
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
          accessToken: {
            type: 'string',
            description:
              'Backward-compatible alias of token for clients that still expect accessToken.',
          },
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
          mfaEnrollmentRequired: {
            type: 'boolean',
            description:
              'Returned on successful auth responses for privileged users who must enroll in MFA before accessing privileged routes.',
          },
          user: { $ref: '#/components/schemas/AuthUser' },
        },
        required: [
          'token',
          'accessToken',
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
      CreateRegionRequest: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          designation: { type: 'string' },
        },
        required: ['code', 'name'],
      },
      UpdateRegionRequest: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          designation: { type: 'string', nullable: true },
        },
      },
      CreateProvinceRequest: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          regionId: { type: 'string', format: 'uuid' },
        },
        required: ['code', 'name', 'regionId'],
      },
      UpdateProvinceRequest: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          regionId: { type: 'string', format: 'uuid' },
        },
      },
      CreateCityMunicipalityRequest: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['CITY', 'MUNICIPALITY'] },
          provinceId: { type: 'string', format: 'uuid' },
        },
        required: ['code', 'name', 'type', 'provinceId'],
      },
      UpdateCityMunicipalityRequest: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['CITY', 'MUNICIPALITY'] },
          provinceId: { type: 'string', format: 'uuid' },
        },
      },
      CreateBarangayRequest: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          cityMunicipalityId: { type: 'string', format: 'uuid' },
        },
        required: ['code', 'name', 'cityMunicipalityId'],
      },
      UpdateBarangayRequest: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          cityMunicipalityId: { type: 'string', format: 'uuid' },
        },
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
              'Previously uploaded incident media reference. Use POST /incidents/media/upload to generate this value from a base64 payload.',
          },
          mediaUrls: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Ordered list of uploaded incident media references. When both `mediaUrl` and `mediaUrls` are sent, the legacy `mediaUrl` is prepended if it is not already present.',
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
              'Previously uploaded incident media reference. Use POST /incidents/media/upload to generate this value from a base64 payload.',
          },
          mediaUrls: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Ordered list of uploaded incident media references. When both `mediaUrl` and `mediaUrls` are sent, the legacy `mediaUrl` is prepended if it is not already present.',
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
      IncidentTrustInfo: {
        type: 'object',
        properties: {
          caseToken: { type: 'string' },
          caseLookupPath: { type: 'string' },
          caseTokenExpiresAt: { type: 'string', format: 'date-time' },
          publicStatusMessage: { type: 'string' },
        },
        required: ['caseToken', 'caseLookupPath', 'caseTokenExpiresAt', 'publicStatusMessage'],
      },
      CitizenIncidentReportResponse: {
        allOf: [
          { $ref: '#/components/schemas/CitizenIncident' },
          {
            type: 'object',
            properties: {
              trust: { $ref: '#/components/schemas/IncidentTrustInfo' },
            },
            required: ['trust'],
          },
        ],
      },
      MobilePublishedContent: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string', nullable: true },
          body: { type: 'string' },
          contentType: { type: 'string' },
          placement: { type: 'string' },
          audience: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          ctaLabel: { type: 'string', nullable: true },
          ctaUrl: { type: 'string', nullable: true },
          sortOrder: { type: 'integer' },
          publishedAt: { type: 'string', format: 'date-time', nullable: true },
          startsAt: { type: 'string', format: 'date-time', nullable: true },
          endsAt: { type: 'string', format: 'date-time', nullable: true },
          metadata: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: [
          'id',
          'slug',
          'title',
          'summary',
          'body',
          'contentType',
          'placement',
          'audience',
          'imageUrl',
          'ctaLabel',
          'ctaUrl',
          'sortOrder',
          'publishedAt',
          'startsAt',
          'endsAt',
          'metadata',
          'updatedAt',
        ],
      },
      MobileIncidentTimelineEntry: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          changedAt: { type: 'string', format: 'date-time' },
          status: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          },
          publicStatusMessage: { type: 'string' },
        },
        required: ['id', 'changedAt', 'status', 'publicStatusMessage'],
      },
      MobileIncidentTimelineResponse: {
        type: 'object',
        properties: {
          incidentId: { type: 'string', format: 'uuid' },
          publicReference: { type: 'string', nullable: true },
          timeline: {
            type: 'array',
            items: { $ref: '#/components/schemas/MobileIncidentTimelineEntry' },
          },
        },
        required: ['incidentId', 'publicReference', 'timeline'],
      },
      PublicCaseTimelineEntry: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          changedAt: { type: 'string', format: 'date-time' },
          status: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
            required: ['id', 'name'],
          },
          publicStatusMessage: { type: 'string' },
        },
        required: ['id', 'changedAt', 'status', 'publicStatusMessage'],
      },
      PublicCaseLookupResponse: {
        type: 'object',
        properties: {
          publicReference: { type: 'string', nullable: true },
          status: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
            required: ['id', 'name'],
          },
          publicStatusMessage: { type: 'string' },
          caseTokenExpiresAt: { type: 'string', format: 'date-time' },
          reportedAt: { type: 'string', format: 'date-time' },
          lastUpdatedAt: { type: 'string', format: 'date-time' },
          barangay: { type: 'string', nullable: true },
          cityName: { type: 'string', nullable: true },
          provinceName: { type: 'string', nullable: true },
          category: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              subCategory: { type: 'string', nullable: true },
            },
            required: ['id', 'name'],
          },
          severity: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              level: { type: 'string' },
              definition: { type: 'string', nullable: true },
            },
            required: ['id', 'level'],
          },
          timeline: {
            type: 'array',
            items: { $ref: '#/components/schemas/PublicCaseTimelineEntry' },
          },
        },
        required: [
          'publicReference',
          'status',
          'publicStatusMessage',
          'caseTokenExpiresAt',
          'reportedAt',
          'lastUpdatedAt',
          'barangay',
          'cityName',
          'provinceName',
          'category',
          'severity',
          'timeline',
        ],
      },
      IncidentTimelineEntry: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          changedAt: { type: 'string', format: 'date-time' },
          fromStatus: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
          },
          toStatus: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
            required: ['id', 'name'],
          },
          changedByUser: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string' },
              role: { type: 'string' },
            },
          },
          note: { type: 'string', nullable: true },
        },
        required: ['id', 'changedAt', 'fromStatus', 'toStatus', 'changedByUser', 'note'],
      },
      IncidentTimelineResponse: {
        type: 'object',
        properties: {
          incidentId: { type: 'string', format: 'uuid' },
          publicReference: { type: 'string', nullable: true },
          timeline: {
            type: 'array',
            items: { $ref: '#/components/schemas/IncidentTimelineEntry' },
          },
        },
        required: ['incidentId', 'publicReference', 'timeline'],
      },
      AuditorIncidentTimelineEntry: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          changedAt: { type: 'string', format: 'date-time' },
          fromStatus: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
            required: ['id', 'name'],
          },
          toStatus: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
            required: ['id', 'name'],
          },
        },
        required: ['id', 'changedAt', 'fromStatus', 'toStatus'],
      },
      AuditorIncidentTimelineResponse: {
        type: 'object',
        properties: {
          incidentId: { type: 'string', format: 'uuid' },
          publicReference: { type: 'string', nullable: true },
          timeline: {
            type: 'array',
            items: { $ref: '#/components/schemas/AuditorIncidentTimelineEntry' },
          },
        },
        required: ['incidentId', 'publicReference', 'timeline'],
      },
      UpdateIncidentRequest: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          mediaUrl: {
            type: 'string',
            description:
              'Previously uploaded incident media reference. Use POST /incidents/media/upload to generate this value from a base64 payload.',
          },
          mediaUrls: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Ordered list of uploaded incident media references. When both `mediaUrl` and `mediaUrls` are sent, the legacy `mediaUrl` is prepended if it is not already present.',
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
            description:
              'Reusable incident media references for persistence on incident records. In public mode these are public URLs; in signed mode these are stable managed references.',
          },
          accessUrls: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Immediate access URLs for uploaded media. In signed mode these are short-lived signed URLs and should not be persisted back to the database as the canonical reference.',
          },
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                bucket: { type: 'string' },
                objectPath: { type: 'string' },
                mediaUrl: { type: 'string' },
                accessUrl: { type: 'string' },
                contentType: { type: 'string' },
                fileName: { type: 'string' },
                size: { type: 'integer' },
              },
              required: [
                'bucket',
                'objectPath',
                'mediaUrl',
                'accessUrl',
                'contentType',
                'fileName',
                'size',
              ],
            },
          },
        },
        required: ['mediaUrls', 'accessUrls', 'files'],
      },
      IncidentMediaAccessResponse: {
        type: 'object',
        properties: {
          incidentId: { type: 'string', format: 'uuid' },
          mediaId: { type: 'string', format: 'uuid' },
          displayOrder: { type: 'integer' },
          mediaUrl: {
            type: 'string',
            description:
              'Canonical stored media reference. In signed mode this remains a stable managed reference rather than a transient signed URL.',
          },
          accessUrl: {
            type: 'string',
            description:
              'Authorized access URL resolved at request time for the specific incident media file.',
          },
        },
        required: ['incidentId', 'mediaId', 'displayOrder', 'mediaUrl', 'accessUrl'],
      },
      MobileAppContent: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          slug: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string', nullable: true },
          body: { type: 'string' },
          contentType: { type: 'string' },
          placement: { type: 'string' },
          audience: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          ctaLabel: { type: 'string', nullable: true },
          ctaUrl: { type: 'string', nullable: true },
          sortOrder: { type: 'integer' },
          isPublished: { type: 'boolean' },
          publishedAt: { type: 'string', format: 'date-time', nullable: true },
          startsAt: { type: 'string', format: 'date-time', nullable: true },
          endsAt: { type: 'string', format: 'date-time', nullable: true },
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
          'slug',
          'title',
          'summary',
          'body',
          'contentType',
          'placement',
          'audience',
          'imageUrl',
          'ctaLabel',
          'ctaUrl',
          'sortOrder',
          'isPublished',
          'publishedAt',
          'startsAt',
          'endsAt',
          'metadata',
        ],
      },
      CreateMobileAppContentRequest: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string', nullable: true },
          body: { type: 'string' },
          contentType: { type: 'string' },
          placement: { type: 'string' },
          audience: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          ctaLabel: { type: 'string', nullable: true },
          ctaUrl: { type: 'string', nullable: true },
          sortOrder: { type: 'integer' },
          isPublished: { type: 'boolean' },
          publishedAt: { type: 'string', format: 'date-time', nullable: true },
          startsAt: { type: 'string', format: 'date-time', nullable: true },
          endsAt: { type: 'string', format: 'date-time', nullable: true },
          metadata: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
        },
        required: ['slug', 'title', 'body'],
      },
      UpdateMobileAppContentRequest: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string', nullable: true },
          body: { type: 'string' },
          contentType: { type: 'string' },
          placement: { type: 'string' },
          audience: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          ctaLabel: { type: 'string', nullable: true },
          ctaUrl: { type: 'string', nullable: true },
          sortOrder: { type: 'integer' },
          isPublished: { type: 'boolean' },
          publishedAt: { type: 'string', format: 'date-time', nullable: true },
          startsAt: { type: 'string', format: 'date-time', nullable: true },
          endsAt: { type: 'string', format: 'date-time', nullable: true },
          metadata: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
        },
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
          jurisdictionType: {
            type: 'string',
            enum: ['region', 'province', 'city', 'barangay'],
            nullable: true,
            description:
              'Jurisdiction binding for the user. Only region, province, city, and barangay bindings are accepted by the API.',
          },
          jurisdictionId: { type: 'string', format: 'uuid', nullable: true },
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
          jurisdictionType: {
            type: 'string',
            enum: ['region', 'province', 'city', 'barangay'],
            nullable: true,
            description:
              'Jurisdiction binding for the user. Only region, province, city, and barangay bindings are accepted by the API.',
          },
          jurisdictionId: { type: 'string', format: 'uuid', nullable: true },
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
      PaginatedRegionList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Region' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      PaginatedProvinceList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Province' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      PaginatedCityMunicipalityList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/CityMunicipality' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      PaginatedBarangayList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Barangay' } },
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
      PaginatedAuditorIncidentList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/AuditorIncident' } },
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
      PaginatedMobileAppContentList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/MobileAppContent' } },
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

export const openApiDocument = createOpenApiDocument();
