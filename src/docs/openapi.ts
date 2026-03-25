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
		name: 'sortBy',
		in: 'query',
		required: false,
		description: 'Timestamp field used for sorting.',
		schema: { type: 'string', enum: ['createdAt', 'updatedAt'], default: 'createdAt' },
	},
	{
		name: 'sortOrder',
		in: 'query',
		required: false,
		description: 'Sort direction.',
		schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
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

function jsonResponse(schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject, description: string): OpenAPIV3.ResponseObject {
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

function resourcePath(
	pathSegment: string,
	schemaName: string,
	createRequestName: string,
	updateRequestName: string,
	writeSecurity?: OpenAPIV3.SecurityRequirementObject[],
): Record<string, OpenAPIV3.PathItemObject> {
	const pluralPath = `/${pathSegment}`;
	return {
		[pluralPath]: {
			get: {
				tags: [schemaName],
				summary: `List ${schemaName.toLowerCase()}s`,
				parameters: paginationParameters,
				responses: {
					'200': listResponse(schemaName),
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
					'201': jsonResponse({ $ref: `#/components/schemas/${schemaName}` }, `${schemaName} created.`),
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
				parameters: [idParameter],
				responses: {
					'200': jsonResponse({ $ref: `#/components/schemas/${schemaName}` }, `${schemaName} found.`),
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
					'200': jsonResponse({ $ref: `#/components/schemas/${schemaName}` }, `${schemaName} updated.`),
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
	openapi: '3.0.0',
	info: {
		title: 'Xypes CIRS API',
		version: '1.0.0',
		description: 'OpenAPI definition aligned to the current Express and Prisma implementation.',
	},
	servers: [
		{ url: '/api/v1', description: 'Versioned API base path' },
	],
	tags: [
		{ name: 'Health' },
		{ name: 'Auth' },
		{ name: 'Admin' },
		{ name: 'Citizen' },
		{ name: 'Agency' },
		{ name: 'Responder' },
		{ name: 'Status' },
		{ name: 'Category' },
		{ name: 'Severity' },
		{ name: 'Location' },
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
		...resourcePath('citizens', 'Citizen', 'CreateCitizenRequest', 'UpdateCitizenRequest'),
		'/citizens/link-me': {
			post: {
				tags: ['Citizen'],
				summary: 'Create or update the authenticated viewer\'s citizen profile',
				security: [{ BearerAuth: [] }],
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
					'422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
				},
			},
		},
		...resourcePath('agencies', 'Agency', 'CreateAgencyRequest', 'UpdateAgencyRequest', [{ BearerAuth: [] }]),
		...resourcePath('responders', 'Responder', 'CreateResponderRequest', 'UpdateResponderRequest', [{ BearerAuth: [] }]),
		...resourcePath('statuses', 'Status', 'CreateStatusRequest', 'UpdateStatusRequest', [{ BearerAuth: [] }]),
		...resourcePath('categories', 'Category', 'CreateCategoryRequest', 'UpdateCategoryRequest', [{ BearerAuth: [] }]),
		...resourcePath('severities', 'Severity', 'CreateSeverityRequest', 'UpdateSeverityRequest', [{ BearerAuth: [] }]),
		...resourcePath('locations', 'Location', 'CreateLocationRequest', 'UpdateLocationRequest', [{ BearerAuth: [] }]),
		'/incidents': {
			get: {
				tags: ['Incident'],
				summary: 'List incidents',
				security: [{ BearerAuth: [] }],
				parameters: paginationParameters,
				responses: {
					'200': listResponse('CitizenIncident'),
					'401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
					'422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Missing linked citizen profile.'),
				},
			},
			post: {
				tags: ['Incident'],
				summary: 'Create incident',
				security: [{ BearerAuth: [] }],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/CreateIncidentRequest' },
						},
					},
				},
				responses: {
					'201': jsonResponse({ $ref: '#/components/schemas/CitizenIncident' }, 'Incident created.'),
					'400': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Invalid foreign key or input.'),
					'401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
					'403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
				},
			},
		},
		'/incidents/report': {
			post: {
				tags: ['Incident'],
				summary: 'Create an incident report for the authenticated viewer',
				security: [{ BearerAuth: [] }],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/CreateCitizenIncidentReportRequest' },
						},
					},
				},
				responses: {
					'201': jsonResponse({ $ref: '#/components/schemas/CitizenIncident' }, 'Incident report created.'),
					'400': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Invalid foreign key or input.'),
					'401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
					'422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Missing linked citizen profile.'),
				},
			},
		},
		'/incidents/{id}': {
			get: {
				tags: ['Incident'],
				summary: 'Get incident by id',
				security: [{ BearerAuth: [] }],
				parameters: [idParameter],
				responses: {
					'200': jsonResponse({ $ref: '#/components/schemas/CitizenIncident' }, 'Incident found.'),
					'401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
					'404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Incident not found.'),
				},
			},
			patch: {
				tags: ['Incident'],
				summary: 'Update incident',
				security: [{ BearerAuth: [] }],
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
					'200': jsonResponse({ $ref: '#/components/schemas/CitizenIncident' }, 'Incident updated.'),
					'400': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Invalid foreign key or input.'),
					'401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
					'403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
					'404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Incident not found.'),
				},
			},
			delete: {
				tags: ['Incident'],
				summary: 'Delete incident',
				security: [{ BearerAuth: [] }],
				parameters: [idParameter],
				responses: {
					'204': { description: 'Incident deleted.' },
					'401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
					'403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
					'404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Incident not found.'),
				},
			},
		},
		'/assignments': {
			get: {
				tags: ['Assignment'],
				summary: 'List assignments',
				parameters: paginationParameters,
				responses: {
					'200': listResponse('Assignment'),
				},
			},
			post: {
				tags: ['Assignment'],
				summary: 'Create assignment',
				security: [{ BearerAuth: [] }],
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
					'422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Invalid foreign key reference.'),
				},
			},
		},
		'/assignments/{id}': {
			get: {
				tags: ['Assignment'],
				summary: 'Get assignment by id',
				parameters: [idParameter],
				responses: {
					'200': jsonResponse({ $ref: '#/components/schemas/Assignment' }, 'Assignment found.'),
					'404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Assignment not found.'),
				},
			},
			patch: {
				tags: ['Assignment'],
				summary: 'Update assignment',
				security: [{ BearerAuth: [] }],
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
					'404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Assignment not found.'),
					'422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Invalid foreign key reference.'),
				},
			},
			delete: {
				tags: ['Assignment'],
				summary: 'Delete assignment',
				security: [{ BearerAuth: [] }],
				parameters: [idParameter],
				responses: {
					'204': { description: 'Assignment deleted.' },
					'401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
					'403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
					'404': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Assignment not found.'),
				},
			},
		},
		'/users/capabilities': {
			get: {
				tags: ['User'],
				summary: 'Get user-management capabilities',
				security: [{ BearerAuth: [] }],
				responses: {
					'200': jsonResponse({ $ref: '#/components/schemas/UserCapabilities' }, 'Capability flags.'),
					'401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
					'403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
				},
			},
		},
		'/users': {
			get: {
				tags: ['User'],
				summary: 'List users',
				security: [{ BearerAuth: [] }],
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
				security: [{ BearerAuth: [] }],
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
					'409': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Email already exists.'),
					'422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
				},
			},
		},
		'/users/{id}': {
			get: {
				tags: ['User'],
				summary: 'Get user by id',
				security: [{ BearerAuth: [] }],
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
				security: [{ BearerAuth: [] }],
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
					'409': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Email already exists.'),
					'422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
				},
			},
			delete: {
				tags: ['User'],
				summary: 'Delete user',
				security: [{ BearerAuth: [] }],
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
					'201': jsonResponse({ $ref: '#/components/schemas/AuthResponse' }, 'Registration succeeded.'),
					'409': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Email already registered.'),
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
					'200': jsonResponse({ $ref: '#/components/schemas/AuthResponse' }, 'Authentication succeeded.'),
					'401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Invalid credentials.'),
					'422': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Validation error.'),
				},
			},
		},
		'/auth/me': {
			get: {
				tags: ['Auth'],
				summary: 'Return the authenticated user',
				security: [{ BearerAuth: [] }],
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
				security: [{ BearerAuth: [] }],
				parameters: paginationParameters,
				responses: {
					'200': listResponse('UserSummary'),
					'401': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Unauthorized.'),
					'403': jsonResponse({ $ref: '#/components/schemas/ErrorResponse' }, 'Forbidden.'),
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
			Location: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid' },
					createdAt: { type: 'string', format: 'date-time' },
					updatedAt: { type: 'string', format: 'date-time' },
					district: { type: 'string' },
					city: { type: 'string' },
					province: { type: 'string' },
					region: { type: 'string' },
				},
				required: ['id', 'createdAt', 'updatedAt', 'district', 'city', 'province', 'region'],
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
					statusId: { type: 'string', format: 'uuid' },
					citizenId: { type: 'string', format: 'uuid' },
					locationId: { type: 'string', format: 'uuid' },
					categoryId: { type: 'string', format: 'uuid' },
					severityId: { type: 'string', format: 'uuid' },
				},
				required: ['id', 'createdAt', 'updatedAt', 'description', 'dateReported', 'statusId', 'citizenId', 'locationId', 'categoryId', 'severityId'],
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
					password: { type: 'string', minLength: 8 },
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
			CreateLocationRequest: {
				type: 'object',
				properties: {
					district: { type: 'string' },
					city: { type: 'string' },
					province: { type: 'string' },
					region: { type: 'string' },
				},
				required: ['district', 'city', 'province', 'region'],
			},
			UpdateLocationRequest: {
				type: 'object',
				properties: {
					district: { type: 'string' },
					city: { type: 'string' },
					province: { type: 'string' },
					region: { type: 'string' },
				},
			},
			CreateIncidentRequest: {
				type: 'object',
				properties: {
					description: { type: 'string' },
					mediaUrl: { type: 'string' },
					dateReported: { type: 'string', format: 'date-time' },
					statusId: { type: 'string', format: 'uuid' },
					citizenId: { type: 'string', format: 'uuid' },
					locationId: { type: 'string', format: 'uuid' },
					categoryId: { type: 'string', format: 'uuid' },
					severityId: { type: 'string', format: 'uuid' },
				},
				required: ['description', 'statusId', 'citizenId', 'locationId', 'categoryId', 'severityId'],
			},
			CreateCitizenIncidentReportRequest: {
				type: 'object',
				properties: {
					description: { type: 'string' },
					mediaUrl: { type: 'string' },
					dateReported: { type: 'string', format: 'date-time' },
					locationId: { type: 'string', format: 'uuid' },
					categoryId: { type: 'string', format: 'uuid' },
					severityId: { type: 'string', format: 'uuid' },
				},
				required: ['description', 'locationId', 'categoryId', 'severityId'],
			},
			UpdateIncidentRequest: {
				type: 'object',
				properties: {
					description: { type: 'string' },
					mediaUrl: { type: 'string' },
					dateReported: { type: 'string', format: 'date-time' },
					statusId: { type: 'string', format: 'uuid' },
					citizenId: { type: 'string', format: 'uuid' },
					locationId: { type: 'string', format: 'uuid' },
					categoryId: { type: 'string', format: 'uuid' },
					severityId: { type: 'string', format: 'uuid' },
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
					password: { type: 'string', minLength: 8 },
					role: { $ref: '#/components/schemas/UserRole' },
				},
				required: ['name', 'email', 'password'],
			},
			UpdateUserRequest: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					email: { type: 'string', format: 'email' },
					password: { type: 'string', minLength: 8 },
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
			PaginatedUserSummaryList: {
				type: 'object',
				properties: {
					data: { type: 'array', items: { $ref: '#/components/schemas/UserSummary' } },
					pagination: { $ref: '#/components/schemas/PaginationMeta' },
				},
				required: ['data', 'pagination'],
			},
		},
	},
};