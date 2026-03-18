const API_BASE_PATH = process.env.API_BASE_PATH ?? '/api/v1';

const commonErrorSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
  },
};

const validationErrorSchema = {
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
};

const paths = {
  [`${API_BASE_PATH}/health`]: {
    get: {
      summary: 'Health check',
      tags: ['System'],
      security: [],
      responses: {
        '200': {
          description: 'Service is healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' },
                },
              },
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/citizens`]: {
    get: {
      summary: 'List citizens',
      tags: ['Citizens'],
      responses: {
        '200': {
          description: 'Citizen list',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/Citizen' } },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create citizen',
      tags: ['Citizens'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CitizenCreate' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Citizen created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Citizen' },
            },
          },
        },
        '422': {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: validationErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/citizens/{id}`]: {
    get: {
      summary: 'Get citizen by id',
      tags: ['Citizens'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Citizen found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Citizen' },
            },
          },
        },
        '404': {
          description: 'Citizen not found',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/responders`]: {
    get: {
      summary: 'List responders',
      tags: ['Responders'],
      responses: {
        '200': {
          description: 'Responder list',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/Responder' } },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create responder',
      tags: ['Responders'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResponderCreate' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Responder created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Responder' },
            },
          },
        },
        '422': {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: validationErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/responders/{id}`]: {
    get: {
      summary: 'Get responder by id',
      tags: ['Responders'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Responder found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Responder' },
            },
          },
        },
        '404': {
          description: 'Responder not found',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/statuses`]: {
    get: {
      summary: 'List statuses',
      tags: ['Statuses'],
      responses: {
        '200': {
          description: 'Status list',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/Status' } },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create status',
      tags: ['Statuses'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StatusCreate' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Status created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Status' },
            },
          },
        },
        '422': {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: validationErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/statuses/{id}`]: {
    get: {
      summary: 'Get status by id',
      tags: ['Statuses'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Status found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Status' },
            },
          },
        },
        '404': {
          description: 'Status not found',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/categories`]: {
    get: {
      summary: 'List categories',
      tags: ['Categories'],
      responses: {
        '200': {
          description: 'Category list',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create category',
      tags: ['Categories'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CategoryCreate' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Category created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Category' },
            },
          },
        },
        '422': {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: validationErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/categories/{id}`]: {
    get: {
      summary: 'Get category by id',
      tags: ['Categories'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Category found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Category' },
            },
          },
        },
        '404': {
          description: 'Category not found',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/severities`]: {
    get: {
      summary: 'List severities',
      tags: ['Severities'],
      responses: {
        '200': {
          description: 'Severity list',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/Severity' } },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create severity',
      tags: ['Severities'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SeverityCreate' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Severity created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Severity' },
            },
          },
        },
        '422': {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: validationErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/severities/{id}`]: {
    get: {
      summary: 'Get severity by id',
      tags: ['Severities'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Severity found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Severity' },
            },
          },
        },
        '404': {
          description: 'Severity not found',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/locations`]: {
    get: {
      summary: 'List locations',
      tags: ['Locations'],
      responses: {
        '200': {
          description: 'Location list',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/Location' } },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create location',
      tags: ['Locations'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LocationCreate' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Location created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Location' },
            },
          },
        },
        '422': {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: validationErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/locations/{id}`]: {
    get: {
      summary: 'Get location by id',
      tags: ['Locations'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Location found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Location' },
            },
          },
        },
        '404': {
          description: 'Location not found',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/incidents`]: {
    get: {
      summary: 'List incidents',
      tags: ['Incidents'],
      responses: {
        '200': {
          description: 'Incident list',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/CitizenIncident' },
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create incident',
      tags: ['Incidents'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CitizenIncidentCreate' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Incident created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CitizenIncident' },
            },
          },
        },
        '422': {
          description: 'Validation or FK reference failed',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/incidents/{id}`]: {
    get: {
      summary: 'Get incident by id',
      tags: ['Incidents'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Incident found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CitizenIncident' },
            },
          },
        },
        '404': {
          description: 'Incident not found',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/assignments`]: {
    get: {
      summary: 'List assignments',
      tags: ['Assignments'],
      responses: {
        '200': {
          description: 'Assignment list',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/Assignment' } },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create assignment',
      tags: ['Assignments'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AssignmentCreate' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Assignment created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Assignment' },
            },
          },
        },
        '422': {
          description: 'Validation or FK reference failed',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/assignments/{id}`]: {
    get: {
      summary: 'Get assignment by id',
      tags: ['Assignments'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Assignment found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Assignment' },
            },
          },
        },
        '404': {
          description: 'Assignment not found',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/users`]: {
    get: {
      summary: 'List users',
      description: 'Returns all system users.',
      tags: ['Users'],
      responses: {
        '200': {
          description: 'User list',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create user',
      description: 'Creates a new system user.',
      tags: ['Users'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UserCreate' },
          },
        },
      },
      responses: {
        '201': {
          description: 'User created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' },
            },
          },
        },
        '422': {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: validationErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/users/{id}`]: {
    get: {
      summary: 'Get user by id',
      description: 'Returns a single user by numeric ID.',
      tags: ['Users'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'User found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' },
            },
          },
        },
        '404': {
          description: 'User not found',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Xypes CIRS API',
    version: '1.0.0',
    description:
      'Citizen Incident Reporting System API powered by Express, Prisma, and PostgreSQL (Supabase). Protected endpoints use API key auth and rate limiting.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  tags: [
    { name: 'System', description: 'API health and status endpoints.' },
    { name: 'Citizens', description: 'Manage citizens who report incidents.' },
    { name: 'Responders', description: 'Manage emergency responders assigned to incidents.' },
    { name: 'Statuses', description: 'Lookup values for incident status.' },
    { name: 'Categories', description: 'Lookup values for incident category.' },
    { name: 'Severities', description: 'Lookup values for incident severity level.' },
    { name: 'Locations', description: 'Lookup values for geographic incident locations.' },
    { name: 'Incidents', description: 'Manage citizen-reported incidents.' },
    { name: 'Assignments', description: 'Manage responder assignments to incidents.' },
    { name: 'Users', description: 'Manage system users.' },
  ],
  security: [{ ApiKeyAuth: [] }],
  paths,
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description:
          'Required for protected endpoints when API_KEYS or API_KEY is configured. Health and docs endpoints are public.',
      },
    },
    parameters: {
      IdParam: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 1 },
      },
    },
    schemas: {
      Citizen: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string' },
          contactInfo: { type: 'string' },
          preferredChannel: { type: 'string' },
        },
        required: ['id', 'name', 'contactInfo', 'preferredChannel'],
      },
      CitizenCreate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          contactInfo: { type: 'string' },
          preferredChannel: { type: 'string' },
        },
        required: ['name', 'contactInfo', 'preferredChannel'],
      },
      Responder: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string' },
          agency: { type: 'string' },
          role: { type: 'string' },
          contactInfo: { type: 'string' },
        },
        required: ['id', 'name', 'agency', 'role', 'contactInfo'],
      },
      ResponderCreate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          agency: { type: 'string' },
          role: { type: 'string' },
          contactInfo: { type: 'string' },
        },
        required: ['name', 'agency', 'role', 'contactInfo'],
      },
      Status: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string' },
        },
        required: ['id', 'name'],
      },
      StatusCreate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string' },
          subCategory: { type: 'string' },
        },
        required: ['id', 'name'],
      },
      CategoryCreate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          subCategory: { type: 'string' },
        },
        required: ['name'],
      },
      Severity: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          level: { type: 'string' },
          definition: { type: 'string' },
        },
        required: ['id', 'level'],
      },
      SeverityCreate: {
        type: 'object',
        properties: {
          level: { type: 'string' },
          definition: { type: 'string' },
        },
        required: ['level'],
      },
      Location: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          district: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          region: { type: 'string' },
        },
        required: ['id', 'district', 'city', 'province', 'region'],
      },
      LocationCreate: {
        type: 'object',
        properties: {
          district: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          region: { type: 'string' },
        },
        required: ['district', 'city', 'province', 'region'],
      },
      CitizenIncident: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          description: { type: 'string' },
          mediaUrl: { type: 'string' },
          dateReported: { type: 'string', format: 'date-time' },
          statusId: { type: 'integer' },
          citizenId: { type: 'integer' },
          locationId: { type: 'integer' },
          categoryId: { type: 'integer' },
          severityId: { type: 'integer' },
        },
        required: [
          'id',
          'description',
          'dateReported',
          'statusId',
          'citizenId',
          'locationId',
          'categoryId',
          'severityId',
        ],
      },
      CitizenIncidentCreate: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          mediaUrl: { type: 'string' },
          dateReported: { type: 'string', format: 'date-time' },
          statusId: { type: 'integer' },
          citizenId: { type: 'integer' },
          locationId: { type: 'integer' },
          categoryId: { type: 'integer' },
          severityId: { type: 'integer' },
        },
        required: ['description', 'statusId', 'citizenId', 'locationId', 'categoryId', 'severityId'],
      },
      Assignment: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          incidentId: { type: 'integer' },
          responderId: { type: 'integer' },
          assignedDate: { type: 'string', format: 'date-time' },
          responseStart: { type: 'string', format: 'date-time' },
          responseEnd: { type: 'string', format: 'date-time' },
          outcome: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['id', 'incidentId', 'responderId', 'assignedDate'],
      },
      AssignmentCreate: {
        type: 'object',
        properties: {
          incidentId: { type: 'integer' },
          responderId: { type: 'integer' },
          assignedDate: { type: 'string', format: 'date-time' },
          responseStart: { type: 'string', format: 'date-time' },
          responseEnd: { type: 'string', format: 'date-time' },
          outcome: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['incidentId', 'responderId'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
        required: ['id', 'name', 'email'],
      },
      UserCreate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
        required: ['name', 'email'],
      },
    },
  },
} as const;
