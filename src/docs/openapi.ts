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
        summary: `Delete ${schemaName.toLowerCase()}`,
        security: writeSecurity,
        parameters: [idParameter],
        responses: {
          '204': { description: `${schemaName} deleted.` },
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
    description: 'OpenAPI definition aligned to the current Express and Prisma implementation.',
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
        summary: "Create or update the authenticated viewer's citizen profile",
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
      apiKeySecurity,
      apiKeyAndBearerSecurity,
    ),
    ...resourcePath(
      'responders',
      'Responder',
      'CreateResponderRequest',
      'UpdateResponderRequest',
      apiKeySecurity,
      apiKeyAndBearerSecurity,
    ),
    ...resourcePath(
      'statuses',
      'Status',
      'CreateStatusRequest',
      'UpdateStatusRequest',
      apiKeySecurity,
      apiKeyAndBearerSecurity,
    ),
    ...resourcePath(
      'categories',
      'Category',
      'CreateCategoryRequest',
      'UpdateCategoryRequest',
      apiKeySecurity,
      apiKeyAndBearerSecurity,
    ),
    ...resourcePath(
      'severities',
      'Severity',
      'CreateSeverityRequest',
      'UpdateSeverityRequest',
      apiKeySecurity,
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
    '/incidents/report': {
      post: {
        tags: ['Incident'],
        summary: 'Create an incident report for the authenticated viewer',
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
        summary: 'Delete incident',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '204': { description: 'Incident deleted.' },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Incident not found.',
          ),
        },
      },
    },
    '/assignments': {
      get: {
        tags: ['Assignment'],
        summary: 'List assignments',
        security: apiKeySecurity,
        parameters: paginationParameters,
        responses: {
          '200': listResponse('Assignment'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
        },
      },
      post: {
        tags: ['Assignment'],
        summary: 'Create assignment',
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
        security: apiKeySecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/Assignment' }, 'Assignment found.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Assignment not found.',
          ),
        },
      },
      patch: {
        tags: ['Assignment'],
        summary: 'Update assignment',
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
        summary: 'Delete assignment',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '204': { description: 'Assignment deleted.' },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse(
            { $ref: '#/components/schemas/ErrorResponse' },
            'Assignment not found.',
          ),
        },
      },
    },
    '/users/capabilities': {
      get: {
        tags: ['User'],
        summary: 'Get user-management capabilities',
        security: apiKeyAndBearerSecurity,
        responses: {
          '200': jsonResponse(
            { $ref: '#/components/schemas/UserCapabilities' },
            'Capability flags.',
          ),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
        },
      },
    },
    '/users': {
      get: {
        tags: ['User'],
        summary: 'List users',
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
        summary: 'Delete user',
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '204': { description: 'User deleted.' },
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'User not found.'),
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a viewer account',
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
        summary: 'Authenticate user and return JWT',
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
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Return the authenticated user',
        security: apiKeyAndBearerSecurity,
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/AuthUser' }, 'Authenticated user.'),
          '401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
          '404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'User not found.'),
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users for admin dashboard',
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
        security: apiKeyAndBearerSecurity,
        parameters: paginationParameters,
        responses: {
          '200': listResponse('AuditLog'),
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
        security: apiKeyAndBearerSecurity,
        parameters: [idParameter],
        responses: {
          '200': jsonResponse({ $ref: '#/components/schemas/AuditLog' }, 'Audit log found.'),
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
        enum: ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'RESPONDER', 'VIEWER'],
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
          actorRole: { $ref: '#/components/schemas/UserRole' },
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
        allOf: [{ $ref: '#/components/schemas/UserSummary' }],
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
        properties: {
          canUpdateUser: { type: 'boolean' },
          canDeleteUser: { type: 'boolean' },
        },
        required: ['canUpdateUser', 'canDeleteUser'],
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
        },
        required: ['email', 'password'],
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          tokenType: { type: 'string', example: 'Bearer' },
          user: { $ref: '#/components/schemas/AuthUser' },
        },
        required: ['token', 'tokenType', 'user'],
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
          mediaUrl: { type: 'string' },
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
          mediaUrl: { type: 'string' },
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
          mediaUrl: { type: 'string' },
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
