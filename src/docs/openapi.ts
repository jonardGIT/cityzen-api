// Minimal valid OpenAPI document for xypes-cirs-api
import { OpenAPIV3 } from 'openapi-types';

export const openApiDocument: OpenAPIV3.Document = {
	openapi: '3.0.0',
	info: {
		title: 'Xypes CIRS API',
		version: '1.0.0',
		description: 'Minimal OpenAPI definition for health endpoint.'
	},
	paths: {
		'/health': {
			get: {
				summary: 'Health check',
				responses: {
					'200': {
						description: 'OK',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										status: { type: 'string' }
									}
								}
							}
						}
					}
				}
			}
		}
	}
};