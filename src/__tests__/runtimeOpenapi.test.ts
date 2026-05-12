import { createOpenApiDocument } from '../docs/openapi.js';
import { loadRuntimeOpenApiDocument } from '../docs/runtimeOpenapi.js';

describe('loadRuntimeOpenApiDocument', () => {
  it('marks a successfully loaded full document as internal-only and injects a warning into the description', () => {
    const loadedDocument = {
      openapi: '3.0.3',
      info: {
        title: 'Full Local OpenAPI',
        version: '1.0.0',
        description: 'Private developer notes.',
      },
      paths: {},
    };

    const runtimeDocument = loadRuntimeOpenApiDocument({
      modulePath: '/local/openapi.full.ts',
      requireFn: () => ({ openApiDocument: loadedDocument }),
    });

    expect(runtimeDocument).toMatchObject({
      'x-internal-only-docs': true,
      info: {
        description: expect.stringContaining(
          'WARNING: This full OpenAPI contract may contain sensitive setup details, internal-only operational guidance, and implementation instructions. Do not expose it in production or public mirrors.',
        ),
      },
    });
    expect(runtimeDocument.info.description).toContain('Private developer notes.');
    expect(loadedDocument).not.toHaveProperty('x-internal-only-docs');
    expect(loadedDocument.info.description).toBe('Private developer notes.');
  });

  it('falls back to the tracked placeholder document when the local-only file cannot be loaded', () => {
    const fallbackDocument = loadRuntimeOpenApiDocument({
      modulePath: '/missing/openapi.full.ts',
      requireFn: () => {
        throw new Error('missing');
      },
    });

    expect(fallbackDocument).toEqual(createOpenApiDocument());
  });

  it('falls back to the tracked placeholder document when the loaded module is not a valid OpenAPI export', () => {
    const fallbackDocument = loadRuntimeOpenApiDocument({
      modulePath: '/invalid/openapi.full.ts',
      requireFn: () => ({ openApiDocument: null }),
    });

    expect(fallbackDocument).toEqual(createOpenApiDocument());
  });
});
