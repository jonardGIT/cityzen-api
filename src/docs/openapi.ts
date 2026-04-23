import { OpenAPIV3 } from 'openapi-types';
import { getFeatureSelection, type FeatureSelection } from '../featureSelection.js';

type OpenApiDocumentWithMetadata = OpenAPIV3.Document & {
  'x-local-only-docs': boolean;
  'x-feature-profile': {
    profileSource: FeatureSelection['profileSource'];
    profileName: FeatureSelection['profileName'];
    authProvider: FeatureSelection['authProvider'];
    tokenMode: FeatureSelection['tokenMode'];
    mfaMode: FeatureSelection['mfaMode'];
    mediaStorage: FeatureSelection['mediaStorage'];
    recordDeletion: FeatureSelection['recordDeletion'];
  };
};

export function createOpenApiDocument(
  selection: FeatureSelection = getFeatureSelection(),
): OpenApiDocumentWithMetadata {
  return {
    openapi: '3.0.3',
    info: {
      title: 'xypes-cirs-api',
      version: 'local-only',
      description:
        'The detailed OpenAPI contract is intentionally kept as a local-only artifact and is not tracked in this repository. Use the local-only docs workspace copy when you need the full internal API specification. The active contract includes public password-reset request and confirm flows with production-safe delivery behavior.',
    },
    servers: [{ url: process.env.API_BASE_PATH ?? '/api/v1' }],
    tags: [
      {
        name: 'LocalOnly',
        description:
          'This tracked document is a public-safe placeholder. The full internal OpenAPI definition is stored locally only.',
      },
    ],
    paths: {},
    components: {},
    'x-local-only-docs': true,
    'x-feature-profile': {
      profileSource: selection.profileSource,
      profileName: selection.profileName,
      authProvider: selection.authProvider,
      tokenMode: selection.tokenMode,
      mfaMode: selection.mfaMode,
      mediaStorage: selection.mediaStorage,
      recordDeletion: selection.recordDeletion,
    },
  };
}

export const openApiDocument = createOpenApiDocument();
