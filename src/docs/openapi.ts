const API_BASE_PATH = process.env.API_BASE_PATH ?? '/api/v1';

const commonErrorSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
  },
  examples: [
    { message: 'Unauthorized: bearer token required' },
    { message: 'Forbidden: insufficient role permissions' },
    { message: 'Conflict: resource violates a unique constraint' },
    { message: 'Conflict: resource is still referenced by other records' },
  ],
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
  example: {
    message: 'Validation failed',
    errors: [
      {
        field: 'email',
        message: 'email must be a valid email address',
      },
      {
        field: 'password',
        message: 'password must be at least 8 characters',
      },
    ],
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
  [`${API_BASE_PATH}/auth/register`]: {
    post: {
      summary: 'Register a viewer user and get JWT token',
      tags: ['Auth'],
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterRequest' },
            examples: {
              viewerRegistration: {
                summary: 'Standard viewer registration',
                value: {
                  name: 'Jane Citizen',
                  email: 'jane.citizen@xypes.local',
                  password: 'Password123!',
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Registration successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginResponse' },
            },
          },
        },
        '409': {
          description: 'Email already registered',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '422': {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/auth/login`]: {
    post: {
      summary: 'Login and get JWT token',
      tags: ['Auth'],
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
            examples: {
              adminLogin: {
                summary: 'Seeded admin login',
                value: {
                  email: 'admin@xypes.local',
                  password: 'Password123!',
                },
              },
              viewerLogin: {
                summary: 'Viewer login',
                value: {
                  email: 'viewer@xypes.local',
                  password: 'Password123!',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Authentication successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginResponse' },
            },
          },
        },
        '401': {
          description: 'Invalid credentials',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/auth/me`]: {
    get: {
      summary: 'Get current authenticated user',
      tags: ['Auth'],
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Current authenticated user',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/admin/users`]: {
    get: {
      summary: 'List all users (admin roles only)',
      description:
        'Supports optional pagination with page and pageSize. Without pagination params, returns the legacy array response.',
      tags: ['Admin'],
      security: [{ BearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/PageSizeParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        { $ref: '#/components/parameters/CreatedFromParam' },
        { $ref: '#/components/parameters/CreatedToParam' },
        { $ref: '#/components/parameters/UpdatedFromParam' },
        { $ref: '#/components/parameters/UpdatedToParam' },
      ],
      responses: {
        '200': {
          description: 'User list',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  { $ref: '#/components/schemas/PaginatedUserList' },
                ],
              },
            },
          },
        },
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/citizens`]: {
    get: {
      summary: 'List citizens',
      description:
        'Supports optional pagination with page and pageSize. Without pagination params, returns the legacy array response.',
      tags: ['Citizens'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/PageSizeParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        { $ref: '#/components/parameters/CreatedFromParam' },
        { $ref: '#/components/parameters/CreatedToParam' },
        { $ref: '#/components/parameters/UpdatedFromParam' },
        { $ref: '#/components/parameters/UpdatedToParam' },
      ],
      responses: {
        '200': {
          description: 'Citizen list',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { type: 'array', items: { $ref: '#/components/schemas/Citizen' } },
                  { $ref: '#/components/schemas/PaginatedCitizenList' },
                ],
              },
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
            examples: {
              basicCitizen: {
                summary: 'Create a citizen reporter',
                value: {
                  name: 'Postman Citizen',
                  contactInfo: 'citizen@example.com',
                  preferredChannel: 'sms',
                },
              },
            },
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
  [`${API_BASE_PATH}/citizens/link-me`]: {
    post: {
      summary: 'Link authenticated viewer to citizen profile',
      description:
        'Creates or updates a citizen profile linked to the authenticated VIEWER account. contactInfo is server-managed and always set from the authenticated user email; client-provided contactInfo is rejected.',
      tags: ['Citizens'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CitizenLinkMeRequest' },
            examples: {
              createLinkedProfile: {
                summary: 'Create linked citizen profile',
                value: {
                  name: 'Jane Citizen',
                  preferredChannel: 'app',
                },
              },
              updateChannelOnly: {
                summary: 'Update linked profile channel',
                value: {
                  preferredChannel: 'sms',
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Linked citizen profile created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Citizen' },
            },
          },
        },
        '200': {
          description: 'Linked citizen profile updated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Citizen' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Only VIEWER role can access this endpoint',
          content: {
            'application/json': {
              schema: commonErrorSchema,
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
    patch: {
      summary: 'Update citizen',
      description: 'Updates a citizen. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Citizens'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CitizenUpdate' },
            examples: {
              changeChannel: {
                summary: 'Update communication channel',
                value: {
                  preferredChannel: 'app',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Citizen updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Citizen' } } } },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Citizen not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '422': { description: 'Validation failed', content: { 'application/json': { schema: validationErrorSchema } } },
      },
    },
    delete: {
      summary: 'Delete citizen',
      description: 'Deletes a citizen. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Citizens'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '204': { description: 'Citizen deleted' },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Citizen not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '409': { description: 'Citizen is still referenced by other records', content: { 'application/json': { schema: commonErrorSchema } } },
      },
    },
  },
  [`${API_BASE_PATH}/agencies`]: {
    get: {
      summary: 'List agencies',
      description:
        'Supports optional pagination with page and pageSize. Without pagination params, returns the legacy array response.',
      tags: ['Agencies'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/PageSizeParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        { $ref: '#/components/parameters/CreatedFromParam' },
        { $ref: '#/components/parameters/CreatedToParam' },
        { $ref: '#/components/parameters/UpdatedFromParam' },
        { $ref: '#/components/parameters/UpdatedToParam' },
      ],
      responses: {
        '200': {
          description: 'Agency list',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { type: 'array', items: { $ref: '#/components/schemas/Agency' } },
                  { $ref: '#/components/schemas/PaginatedAgencyList' },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create agency',
      description: 'Creates an agency. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Agencies'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AgencyCreate' },
            examples: {
              publicSafetyOffice: {
                summary: 'Create agency record',
                value: {
                  name: 'Public Safety Office',
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Agency created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Agency' },
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
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/agencies/{id}`]: {
    get: {
      summary: 'Get agency by id',
      tags: ['Agencies'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Agency found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Agency' },
            },
          },
        },
        '404': {
          description: 'Agency not found',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
    patch: {
      summary: 'Update agency',
      description: 'Updates an agency. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Agencies'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AgencyUpdate' },
            examples: {
              renameAgency: {
                summary: 'Rename agency',
                value: {
                  name: 'City Rescue Office',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Agency updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Agency' } } } },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Agency not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '422': { description: 'Validation failed', content: { 'application/json': { schema: validationErrorSchema } } },
      },
    },
    delete: {
      summary: 'Delete agency',
      description: 'Deletes an agency. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Agencies'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '204': { description: 'Agency deleted' },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Agency not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '409': { description: 'Agency is still referenced by responder records', content: { 'application/json': { schema: commonErrorSchema } } },
      },
    },
  },
  [`${API_BASE_PATH}/responders`]: {
    get: {
      summary: 'List responders',
      description:
        'Supports optional pagination with page and pageSize. Without pagination params, returns the legacy array response.',
      tags: ['Responders'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/PageSizeParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        { $ref: '#/components/parameters/CreatedFromParam' },
        { $ref: '#/components/parameters/CreatedToParam' },
        { $ref: '#/components/parameters/UpdatedFromParam' },
        { $ref: '#/components/parameters/UpdatedToParam' },
      ],
      responses: {
        '200': {
          description: 'Responder list',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { type: 'array', items: { $ref: '#/components/schemas/Responder' } },
                  { $ref: '#/components/schemas/PaginatedResponderList' },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create responder',
      description: 'Creates a responder. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Responders'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResponderCreate' },
            examples: {
              fireOfficer: {
                summary: 'Create responder profile',
                value: {
                  name: 'Postman Responder',
                  agencyId: 1,
                  role: 'Officer',
                  contactInfo: 'responder@example.com',
                },
              },
            },
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
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
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
    patch: {
      summary: 'Update responder',
      description: 'Updates a responder. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Responders'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResponderUpdate' },
            examples: {
              moveAgency: {
                summary: 'Update responder agency',
                value: {
                  agencyId: 2,
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Responder updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Responder' } } } },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Responder not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '422': { description: 'Validation failed', content: { 'application/json': { schema: validationErrorSchema } } },
      },
    },
    delete: {
      summary: 'Delete responder',
      description: 'Deletes a responder. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Responders'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '204': { description: 'Responder deleted' },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Responder not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '409': { description: 'Responder is still referenced by other records', content: { 'application/json': { schema: commonErrorSchema } } },
      },
    },
  },
  [`${API_BASE_PATH}/statuses`]: {
    get: {
      summary: 'List statuses',
      description:
        'Supports optional pagination with page and pageSize. Without pagination params, returns the legacy array response.',
      tags: ['Statuses'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/PageSizeParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        { $ref: '#/components/parameters/CreatedFromParam' },
        { $ref: '#/components/parameters/CreatedToParam' },
        { $ref: '#/components/parameters/UpdatedFromParam' },
        { $ref: '#/components/parameters/UpdatedToParam' },
      ],
      responses: {
        '200': {
          description: 'Status list',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { type: 'array', items: { $ref: '#/components/schemas/Status' } },
                  { $ref: '#/components/schemas/PaginatedStatusList' },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create status',
      description: 'Creates a status. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Statuses'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StatusCreate' },
            examples: {
              openStatus: {
                summary: 'Create status',
                value: {
                  name: 'Open',
                },
              },
            },
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
        '409': {
          description: 'Status already exists (unique name)',
          content: {
            'application/json': {
              schema: commonErrorSchema,
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
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
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
    patch: {
      summary: 'Update status',
      description: 'Updates a status. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Statuses'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StatusUpdate' },
            examples: {
              renameStatus: {
                summary: 'Rename status',
                value: {
                  name: 'In Review',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Status updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Status' } } } },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Status not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '422': { description: 'Validation failed', content: { 'application/json': { schema: validationErrorSchema } } },
      },
    },
    delete: {
      summary: 'Delete status',
      description: 'Deletes a status. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Statuses'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '204': { description: 'Status deleted' },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Status not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '409': { description: 'Status is still referenced by other records', content: { 'application/json': { schema: commonErrorSchema } } },
      },
    },
  },
  [`${API_BASE_PATH}/categories`]: {
    get: {
      summary: 'List categories',
      description:
        'Supports optional pagination with page and pageSize. Without pagination params, returns the legacy array response.',
      tags: ['Categories'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/PageSizeParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        { $ref: '#/components/parameters/CreatedFromParam' },
        { $ref: '#/components/parameters/CreatedToParam' },
        { $ref: '#/components/parameters/UpdatedFromParam' },
        { $ref: '#/components/parameters/UpdatedToParam' },
      ],
      responses: {
        '200': {
          description: 'Category list',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { type: 'array', items: { $ref: '#/components/schemas/Category' } },
                  { $ref: '#/components/schemas/PaginatedCategoryList' },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create category',
      description: 'Creates a category. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Categories'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CategoryCreate' },
            examples: {
              floodCategory: {
                summary: 'Create incident category',
                value: {
                  name: 'Flood',
                  subCategory: 'Urban',
                },
              },
            },
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
        '409': {
          description: 'Category already exists (unique name)',
          content: {
            'application/json': {
              schema: commonErrorSchema,
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
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
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
    patch: {
      summary: 'Update category',
      description: 'Updates a category. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Categories'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CategoryUpdate' },
            examples: {
              changeSubCategory: {
                summary: 'Update category sub-type',
                value: {
                  subCategory: 'River Overflow',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Category updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Category not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '422': { description: 'Validation failed', content: { 'application/json': { schema: validationErrorSchema } } },
      },
    },
    delete: {
      summary: 'Delete category',
      description: 'Deletes a category. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Categories'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '204': { description: 'Category deleted' },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Category not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '409': { description: 'Category is still referenced by other records', content: { 'application/json': { schema: commonErrorSchema } } },
      },
    },
  },
  [`${API_BASE_PATH}/severities`]: {
    get: {
      summary: 'List severities',
      description:
        'Supports optional pagination with page and pageSize. Without pagination params, returns the legacy array response.',
      tags: ['Severities'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/PageSizeParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        { $ref: '#/components/parameters/CreatedFromParam' },
        { $ref: '#/components/parameters/CreatedToParam' },
        { $ref: '#/components/parameters/UpdatedFromParam' },
        { $ref: '#/components/parameters/UpdatedToParam' },
      ],
      responses: {
        '200': {
          description: 'Severity list',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { type: 'array', items: { $ref: '#/components/schemas/Severity' } },
                  { $ref: '#/components/schemas/PaginatedSeverityList' },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create severity',
      description: 'Creates a severity. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Severities'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SeverityCreate' },
            examples: {
              highSeverity: {
                summary: 'Create severity level',
                value: {
                  level: 'High',
                  definition: 'Major impact',
                },
              },
            },
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
        '409': {
          description: 'Severity already exists (unique level)',
          content: {
            'application/json': {
              schema: commonErrorSchema,
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
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
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
    patch: {
      summary: 'Update severity',
      description: 'Updates a severity. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Severities'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SeverityUpdate' },
            examples: {
              tweakDefinition: {
                summary: 'Update severity definition',
                value: {
                  definition: 'Updated impact definition',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Severity updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Severity' } } } },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Severity not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '422': { description: 'Validation failed', content: { 'application/json': { schema: validationErrorSchema } } },
      },
    },
    delete: {
      summary: 'Delete severity',
      description: 'Deletes a severity. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Severities'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '204': { description: 'Severity deleted' },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Severity not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '409': { description: 'Severity is still referenced by other records', content: { 'application/json': { schema: commonErrorSchema } } },
      },
    },
  },
  [`${API_BASE_PATH}/locations`]: {
    get: {
      summary: 'List locations',
      description:
        'Supports optional pagination with page and pageSize. Without pagination params, returns the legacy array response.',
      tags: ['Locations'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/PageSizeParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        { $ref: '#/components/parameters/CreatedFromParam' },
        { $ref: '#/components/parameters/CreatedToParam' },
        { $ref: '#/components/parameters/UpdatedFromParam' },
        { $ref: '#/components/parameters/UpdatedToParam' },
      ],
      responses: {
        '200': {
          description: 'Location list',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { type: 'array', items: { $ref: '#/components/schemas/Location' } },
                  { $ref: '#/components/schemas/PaginatedLocationList' },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create location',
      description: 'Creates a location. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Locations'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LocationCreate' },
            examples: {
              metroLocation: {
                summary: 'Create incident location',
                value: {
                  district: 'District 1',
                  city: 'Manila',
                  province: 'NCR',
                  region: 'National Capital Region',
                },
              },
            },
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
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
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
    patch: {
      summary: 'Update location',
      description: 'Updates a location. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Locations'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LocationUpdate' },
            examples: {
              moveCity: {
                summary: 'Update city name',
                value: {
                  city: 'Quezon City',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Location updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Location' } } } },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Location not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '422': { description: 'Validation failed', content: { 'application/json': { schema: validationErrorSchema } } },
      },
    },
    delete: {
      summary: 'Delete location',
      description: 'Deletes a location. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Locations'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '204': { description: 'Location deleted' },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Location not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '409': { description: 'Location is still referenced by other records', content: { 'application/json': { schema: commonErrorSchema } } },
      },
    },
  },
  [`${API_BASE_PATH}/incidents`]: {
    get: {
      summary: 'List incidents',
      description:
        'Returns incidents for authenticated users. VIEWER users only see their own incident reports; staff roles can see all incidents. Supports optional pagination with page and pageSize. Without pagination params, returns the legacy array response.',
      tags: ['Incidents'],
      security: [{ BearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/PageSizeParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        { $ref: '#/components/parameters/CreatedFromParam' },
        { $ref: '#/components/parameters/CreatedToParam' },
        { $ref: '#/components/parameters/UpdatedFromParam' },
        { $ref: '#/components/parameters/UpdatedToParam' },
      ],
      responses: {
        '200': {
          description: 'Incident list',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    type: 'array',
                    items: { $ref: '#/components/schemas/CitizenIncident' },
                  },
                  { $ref: '#/components/schemas/PaginatedCitizenIncidentList' },
                ],
              },
            },
          },
        },
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '422': {
          description: 'VIEWER account has no linked citizen profile',
          content: {
            'application/json': {
              schema: validationErrorSchema,
            },
          },
        },
      },
    },
    post: {
      summary: 'Create incident',
      description:
        'Creates an incident. Requires Bearer token with SUPER_ADMIN, ADMIN, DISPATCHER, or RESPONDER role.',
      tags: ['Incidents'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CitizenIncidentCreate' },
            examples: {
              floodReport: {
                summary: 'Create an incident report',
                value: {
                  description: 'Street flooding near school',
                  statusId: 1,
                  citizenId: 1,
                  locationId: 1,
                  categoryId: 1,
                  severityId: 1,
                },
              },
            },
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
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/incidents/report`]: {
    post: {
      summary: 'Citizen self-report incident',
      description:
        'Allows an authenticated VIEWER user to submit an incident. citizenId is server-managed and inferred from the authenticated account context; client-provided citizenId is rejected.',
      tags: ['Incidents'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CitizenIncidentReportCreate' },
            examples: {
              citizenMobileReport: {
                summary: 'Citizen mobile incident submission',
                value: {
                  description: 'Flood water rising near barangay hall',
                  statusId: 1,
                  locationId: 1,
                  categoryId: 1,
                  severityId: 1,
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Incident reported successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CitizenIncident' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Only VIEWER role can access this endpoint',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '422': {
          description: 'Validation failed or citizen profile not linked to account email',
          content: {
            'application/json': {
              schema: validationErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/incidents/{id}`]: {
    get: {
      summary: 'Get incident by id',
      description:
        'Returns an incident by ID for authenticated users. VIEWER users can only access their own incident reports.',
      tags: ['Incidents'],
      security: [{ BearerAuth: [] }],
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
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '422': {
          description: 'VIEWER account has no linked citizen profile',
          content: {
            'application/json': {
              schema: validationErrorSchema,
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
    patch: {
      summary: 'Update incident',
      description: 'Updates an incident. Requires Bearer token with SUPER_ADMIN, ADMIN, DISPATCHER, or RESPONDER role.',
      tags: ['Incidents'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CitizenIncidentUpdate' },
            examples: {
              reviseDescription: {
                summary: 'Update incident detail',
                value: {
                  description: 'Street flooding near school gate',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Incident updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/CitizenIncident' } } } },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Incident not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '422': { description: 'Validation or FK reference failed', content: { 'application/json': { schema: validationErrorSchema } } },
      },
    },
    delete: {
      summary: 'Delete incident',
      description: 'Deletes an incident. Requires Bearer token with SUPER_ADMIN, ADMIN, DISPATCHER, or RESPONDER role.',
      tags: ['Incidents'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '204': { description: 'Incident deleted' },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Incident not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '409': { description: 'Incident is still referenced by other records', content: { 'application/json': { schema: commonErrorSchema } } },
      },
    },
  },
  [`${API_BASE_PATH}/assignments`]: {
    get: {
      summary: 'List assignments',
      description:
        'Supports optional pagination with page and pageSize. Without pagination params, returns the legacy array response.',
      tags: ['Assignments'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/PageSizeParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        { $ref: '#/components/parameters/CreatedFromParam' },
        { $ref: '#/components/parameters/CreatedToParam' },
        { $ref: '#/components/parameters/UpdatedFromParam' },
        { $ref: '#/components/parameters/UpdatedToParam' },
      ],
      responses: {
        '200': {
          description: 'Assignment list',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { type: 'array', items: { $ref: '#/components/schemas/Assignment' } },
                  { $ref: '#/components/schemas/PaginatedAssignmentList' },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create assignment',
      description:
        'Creates an assignment. Requires Bearer token with SUPER_ADMIN, ADMIN, or DISPATCHER role.',
      tags: ['Assignments'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AssignmentCreate' },
            examples: {
              assignResponder: {
                summary: 'Assign responder to incident',
                value: {
                  incidentId: 1,
                  responderId: 1,
                },
              },
            },
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
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
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
    patch: {
      summary: 'Update assignment',
      description: 'Updates an assignment. Requires Bearer token with SUPER_ADMIN, ADMIN, or DISPATCHER role.',
      tags: ['Assignments'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AssignmentUpdate' },
            examples: {
              addOutcome: {
                summary: 'Update assignment outcome',
                value: {
                  outcome: 'Monitoring',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Assignment updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Assignment' } } } },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Assignment not found', content: { 'application/json': { schema: commonErrorSchema } } },
        '422': { description: 'Validation or FK reference failed', content: { 'application/json': { schema: validationErrorSchema } } },
      },
    },
    delete: {
      summary: 'Delete assignment',
      description: 'Deletes an assignment. Requires Bearer token with SUPER_ADMIN, ADMIN, or DISPATCHER role.',
      tags: ['Assignments'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '204': { description: 'Assignment deleted' },
        '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: commonErrorSchema } } },
        '403': { description: 'Insufficient role permissions', content: { 'application/json': { schema: commonErrorSchema } } },
        '404': { description: 'Assignment not found', content: { 'application/json': { schema: commonErrorSchema } } },
      },
    },
  },
  [`${API_BASE_PATH}/users/capabilities`]: {
    get: {
      summary: 'Get user management capabilities',
      description:
        'Returns boolean flags indicating whether the authenticated admin can update and delete users. Requires SUPER_ADMIN or ADMIN role.',
      tags: ['Users'],
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Capability flags',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserCapabilities' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid bearer token',
          content: { 'application/json': { schema: commonErrorSchema } },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: { 'application/json': { schema: commonErrorSchema } },
        },
      },
    },
  },
  [`${API_BASE_PATH}/users`]: {
    get: {
      summary: 'List users',
      description:
        'Returns all system users. Requires Bearer token with SUPER_ADMIN or ADMIN role. Supports optional pagination with page and pageSize. Without pagination params, returns the legacy array response.',
      tags: ['Users'],
      security: [{ BearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/PageSizeParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        { $ref: '#/components/parameters/CreatedFromParam' },
        { $ref: '#/components/parameters/CreatedToParam' },
        { $ref: '#/components/parameters/UpdatedFromParam' },
        { $ref: '#/components/parameters/UpdatedToParam' },
      ],
      responses: {
        '200': {
          description: 'User list',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  { $ref: '#/components/schemas/PaginatedUserList' },
                ],
              },
            },
          },
        },
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
    post: {
      summary: 'Create user',
      description:
        'Creates a new system user. SUPER_ADMIN and ADMIN can create only users with a lower access level than their own.',
      tags: ['Users'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UserCreate' },
            examples: {
              createDispatcher: {
                summary: 'Create dispatcher account',
                value: {
                  name: 'Dispatcher One',
                  email: 'dispatcher.one@xypes.local',
                  password: 'Password123!',
                  role: 'DISPATCHER',
                },
              },
              createViewer: {
                summary: 'Create viewer account',
                value: {
                  name: 'Viewer One',
                  email: 'viewer.one@xypes.local',
                  password: 'Password123!',
                  role: 'VIEWER',
                },
              },
            },
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
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '409': {
          description: 'Email already exists',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
  },
  [`${API_BASE_PATH}/users/{id}`]: {
    get: {
      summary: 'Get user by id',
      description: 'Returns a single user by numeric ID. Requires Bearer token with SUPER_ADMIN or ADMIN role.',
      tags: ['Users'],
      security: [{ BearerAuth: [] }],
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
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
      },
    },
    patch: {
      summary: 'Update user',
      description:
        'Updates a user. SUPER_ADMIN and ADMIN can edit only users with a lower access level than their own. Users may update their own name, email, or password but cannot change their own role.',
      tags: ['Users'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UserUpdate' },
            examples: {
              updateUserProfile: {
                summary: 'Update user profile fields',
                value: {
                  name: 'Updated Dispatcher',
                  email: 'updated.dispatcher@xypes.local',
                },
              },
              changeUserRole: {
                summary: 'Admin role update',
                value: {
                  role: 'RESPONDER',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'User updated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' },
            },
          },
        },
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
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
        '409': {
          description: 'Email already exists',
          content: {
            'application/json': {
              schema: commonErrorSchema,
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
    delete: {
      summary: 'Delete user',
      description:
        'Deletes a user. SUPER_ADMIN and ADMIN can delete only users with a lower access level than their own. Self-deletion is not allowed.',
      tags: ['Users'],
      security: [{ BearerAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '204': {
          description: 'User deleted',
        },
        '401': {
          description: 'Missing or invalid bearer token',
          content: {
            'application/json': {
              schema: commonErrorSchema,
            },
          },
        },
        '403': {
          description: 'Insufficient role permissions',
          content: {
            'application/json': {
              schema: commonErrorSchema,
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
    { name: 'Agencies', description: 'Manage responder agencies used as lookup options when assigning responders.' },
    { name: 'Responders', description: 'Manage emergency responders assigned to incidents.' },
    { name: 'Statuses', description: 'Lookup values for incident status.' },
    { name: 'Categories', description: 'Lookup values for incident category.' },
    { name: 'Severities', description: 'Lookup values for incident severity level.' },
    { name: 'Locations', description: 'Lookup values for geographic incident locations.' },
    { name: 'Incidents', description: 'Manage citizen-reported incidents.' },
    { name: 'Assignments', description: 'Manage responder assignments to incidents.' },
    {
      name: 'Users',
      description:
        'Manage system users with hierarchical access rules. SUPER_ADMIN and ADMIN can manage only users with a lower access level than their own.',
    },
    { name: 'Auth', description: 'User authentication and JWT token endpoints.' },
    { name: 'Admin', description: 'Role-protected administration endpoints.' },
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
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    parameters: {
      IdParam: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 1 },
      },
      PageParam: {
        name: 'page',
        in: 'query',
        required: false,
        description: 'Optional page number for paginated responses. When omitted (and pageSize is omitted), the endpoint returns the legacy array response.',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      PageSizeParam: {
        name: 'pageSize',
        in: 'query',
        required: false,
        description: 'Optional page size for paginated responses. Maximum value is 100.',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
      SortByParam: {
        name: 'sortBy',
        in: 'query',
        required: false,
        description: 'Sort field for list responses.',
        schema: {
          type: 'string',
          enum: ['createdAt', 'updatedAt'],
          default: 'createdAt',
        },
      },
      SortOrderParam: {
        name: 'sortOrder',
        in: 'query',
        required: false,
        description: 'Sort direction for list responses.',
        schema: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc',
        },
      },
      CreatedFromParam: {
        name: 'createdFrom',
        in: 'query',
        required: false,
        description: 'Lower inclusive bound for createdAt (ISO-8601 datetime).',
        schema: { type: 'string', format: 'date-time' },
      },
      CreatedToParam: {
        name: 'createdTo',
        in: 'query',
        required: false,
        description: 'Upper inclusive bound for createdAt (ISO-8601 datetime).',
        schema: { type: 'string', format: 'date-time' },
      },
      UpdatedFromParam: {
        name: 'updatedFrom',
        in: 'query',
        required: false,
        description: 'Lower inclusive bound for updatedAt (ISO-8601 datetime).',
        schema: { type: 'string', format: 'date-time' },
      },
      UpdatedToParam: {
        name: 'updatedTo',
        in: 'query',
        required: false,
        description: 'Upper inclusive bound for updatedAt (ISO-8601 datetime).',
        schema: { type: 'string', format: 'date-time' },
      },
    },
    schemas: {
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, example: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
          total: { type: 'integer', minimum: 0, example: 142 },
          totalPages: { type: 'integer', minimum: 0, example: 8 },
          hasNextPage: { type: 'boolean', example: true },
          hasPrevPage: { type: 'boolean', example: false },
        },
        required: ['page', 'pageSize', 'total', 'totalPages', 'hasNextPage', 'hasPrevPage'],
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
      PaginatedLocationList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Location' } },
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
      PaginatedUserList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
        required: ['data', 'pagination'],
      },
      Citizen: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
          contactInfo: { type: 'string' },
          preferredChannel: { type: 'string' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name', 'contactInfo', 'preferredChannel'],
      },
      CitizenCreate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          contactInfo: { type: 'string' },
          preferredChannel: { type: 'string' },
        },
        required: ['name', 'contactInfo', 'preferredChannel'],
        example: {
          name: 'Postman Citizen',
          contactInfo: 'citizen@example.com',
          preferredChannel: 'sms',
        },
      },
      CitizenUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string' },
          contactInfo: { type: 'string' },
          preferredChannel: { type: 'string' },
        },
        example: {
          preferredChannel: 'app',
        },
      },
      CitizenLinkMeRequest: {
        type: 'object',
        description:
          'Payload for linking or updating the authenticated viewer citizen profile. contactInfo is not allowed in this payload and is always bound to the authenticated user email.',
        minProperties: 1,
        properties: {
          name: { type: 'string' },
          preferredChannel: { type: 'string' },
        },
        example: {
          name: 'Jane Citizen',
          preferredChannel: 'app',
        },
      },
      Agency: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string', example: 'City Fire Department' },
          contactNumber: { type: 'string', nullable: true, example: '+1-555-0100' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name'],
      },
      AgencyCreate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          contactNumber: { type: 'string', example: '+1-555-0100' },
        },
        required: ['name'],
        example: {
          name: 'Public Safety Office',
          contactNumber: '+1-555-0199',
        },
      },
      AgencyUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string' },
          contactNumber: { type: 'string', nullable: true, example: '+1-555-0199' },
        },
        example: {
          name: 'City Rescue Office',
          contactNumber: '(555) 0199',
        },
      },
      Responder: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
          agencyId: { type: 'integer', example: 1 },
          agency: { $ref: '#/components/schemas/Agency' },
          role: { type: 'string' },
          contactInfo: { type: 'string' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name', 'agencyId', 'agency', 'role', 'contactInfo'],
      },
      ResponderCreate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          agencyId: { type: 'integer' },
          role: { type: 'string' },
          contactInfo: { type: 'string' },
        },
        required: ['name', 'agencyId', 'role', 'contactInfo'],
        example: {
          name: 'Postman Responder',
          agencyId: 1,
          role: 'Officer',
          contactInfo: 'responder@example.com',
        },
      },
      ResponderUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string' },
          agencyId: { type: 'integer' },
          role: { type: 'string' },
          contactInfo: { type: 'string' },
        },
        example: {
          agencyId: 2,
        },
      },
      Status: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name'],
      },
      StatusCreate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
        example: {
          name: 'Open',
        },
      },
      StatusUpdate: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
        },
        example: {
          name: 'In Review',
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
          subCategory: { type: 'string' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name'],
      },
      CategoryCreate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          subCategory: { type: 'string' },
        },
        required: ['name'],
        example: {
          name: 'Flood',
          subCategory: 'Urban',
        },
      },
      CategoryUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string' },
          subCategory: { type: 'string', nullable: true },
        },
        example: {
          subCategory: 'River Overflow',
        },
      },
      Severity: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          level: { type: 'string' },
          definition: { type: 'string' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'level'],
      },
      SeverityCreate: {
        type: 'object',
        properties: {
          level: { type: 'string' },
          definition: { type: 'string' },
        },
        required: ['level'],
        example: {
          level: 'High',
          definition: 'Major impact',
        },
      },
      SeverityUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          level: { type: 'string' },
          definition: { type: 'string', nullable: true },
        },
        example: {
          definition: 'Updated impact definition',
        },
      },
      Location: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          district: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          region: { type: 'string' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'district', 'city', 'province', 'region'],
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
        example: {
          district: 'District 1',
          city: 'Manila',
          province: 'NCR',
          region: 'National Capital Region',
        },
      },
      LocationUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          district: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          region: { type: 'string' },
        },
        example: {
          city: 'Quezon City',
        },
      },
      CitizenIncident: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
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
          'createdAt',
          'updatedAt',
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
        example: {
          description: 'Street flooding near school',
          statusId: 1,
          citizenId: 1,
          locationId: 1,
          categoryId: 1,
          severityId: 1,
        },
      },
      CitizenIncidentReportCreate: {
        type: 'object',
        description:
          'Payload for viewer self-report incidents. citizenId and statusId must not be sent — citizenId is inferred from the authenticated account context and statusId is automatically set to "Reported".',
        properties: {
          description: { type: 'string' },
          mediaUrl: { type: 'string' },
          dateReported: { type: 'string', format: 'date-time' },
          locationId: { type: 'integer' },
          categoryId: { type: 'integer' },
          severityId: { type: 'integer' },
        },
        required: ['description', 'locationId', 'categoryId', 'severityId'],
        example: {
          description: 'Flood water rising near barangay hall',
          locationId: 1,
          categoryId: 1,
          severityId: 1,
        },
      },
      CitizenIncidentUpdate: {
        type: 'object',
        minProperties: 1,
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
        example: {
          description: 'Street flooding near school gate',
        },
      },
      Assignment: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          incidentId: { type: 'integer' },
          responderId: { type: 'integer' },
          assignedDate: { type: 'string', format: 'date-time' },
          responseStart: { type: 'string', format: 'date-time' },
          responseEnd: { type: 'string', format: 'date-time' },
          outcome: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'incidentId', 'responderId', 'assignedDate'],
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
        example: {
          incidentId: 1,
          responderId: 1,
        },
      },
      AssignmentUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          incidentId: { type: 'integer' },
          responderId: { type: 'integer' },
          assignedDate: { type: 'string', format: 'date-time' },
          responseStart: { type: 'string', format: 'date-time' },
          responseEnd: { type: 'string', format: 'date-time' },
          outcome: { type: 'string' },
          notes: { type: 'string' },
        },
        example: {
          outcome: 'Monitoring',
        },
      },
      UserCapabilities: {
        type: 'object',
        description: 'Flags indicating which user management operations the current admin can perform.',
        properties: {
          canUpdateUser: { type: 'boolean', example: true },
          canDeleteUser: { type: 'boolean', example: true },
        },
        required: ['canUpdateUser', 'canDeleteUser'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: {
            type: 'string',
            enum: ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'RESPONDER', 'VIEWER'],
            example: 'VIEWER',
          },
        },
        required: ['id', 'createdAt', 'updatedAt', 'name', 'email', 'role'],
      },
      UserCreate: {
        type: 'object',
        description:
          'Payload for creating a user. The requested role must be lower than the authenticated admin user\'s access level.',
        properties: {
          name: { type: 'string', example: 'Dispatcher One' },
          email: { type: 'string', format: 'email', example: 'dispatcher.one@xypes.local' },
          password: { type: 'string', format: 'password', minLength: 8, example: 'Password123!' },
          role: {
            type: 'string',
            enum: ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'RESPONDER', 'VIEWER'],
            default: 'VIEWER',
            example: 'DISPATCHER',
          },
        },
        required: ['name', 'email', 'password'],
      },
      UserUpdate: {
        type: 'object',
        minProperties: 1,
        description:
          'Payload for updating a user. At least one field is required. Role changes are restricted by access level, and users cannot change their own role.',
        properties: {
          name: { type: 'string', example: 'Updated Dispatcher' },
          email: { type: 'string', format: 'email', example: 'updated.dispatcher@xypes.local' },
          password: { type: 'string', format: 'password', minLength: 8, example: 'Password123!' },
          role: {
            type: 'string',
            enum: ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'RESPONDER', 'VIEWER'],
            example: 'VIEWER',
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Jane Citizen' },
          email: { type: 'string', format: 'email', example: 'jane.citizen@xypes.local' },
          password: { type: 'string', format: 'password', minLength: 8, example: 'Password123!' },
        },
        required: ['name', 'email', 'password'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
        required: ['email', 'password'],
        example: {
          email: 'admin@xypes.local',
          password: 'Password123!',
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          tokenType: { type: 'string', example: 'Bearer' },
          user: { $ref: '#/components/schemas/User' },
        },
        required: ['token', 'tokenType', 'user'],
      },
    },
  },
} as const;
