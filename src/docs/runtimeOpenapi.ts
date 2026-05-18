import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { OpenAPIV3 } from 'openapi-types';
import { getFeatureSelection } from '../featureSelection.js';
import { openApiDocument as placeholderOpenApiDocument } from './openapi.js';

type OpenApiModule = {
  openApiDocument?: unknown;
  createOpenApiDocument?: () => unknown;
  default?: unknown;
};

type RuntimeOpenApiLoaderOptions = {
  modulePath?: string;
  requireFn?: (id: string) => unknown;
};

type InternalOnlyOpenApiDocument = OpenAPIV3.Document & {
  'x-internal-only-docs'?: true;
};

const requireForDocs = createRequire(path.resolve(process.cwd(), 'package.json'));
const INTERNAL_ONLY_DOCS_EXTENSION = 'x-internal-only-docs';
const INTERNAL_ONLY_DOCS_WARNING =
  'WARNING: This full OpenAPI contract may contain sensitive setup details, internal-only operational guidance, and implementation instructions. Do not expose it in production or public mirrors.';

function loadTranspiledModule(modulePath: string): OpenApiModule | null {
  try {
    const typescript = requireForDocs('typescript') as typeof import('typescript');
    const source = fs
      .readFileSync(modulePath, 'utf8')
      .replace(
        /import\s+\{\s*getFeatureSelection,\s*type\s+FeatureSelection\s*\}\s+from\s+'\.\.\/featureSelection\.js';\s*/m,
        '',
      );
    const compiled = typescript.transpileModule(source, {
      compilerOptions: {
        module: typescript.ModuleKind.CommonJS,
        moduleResolution: typescript.ModuleResolutionKind.NodeJs,
        target: typescript.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: modulePath,
    }).outputText;

    const module = { exports: {} as Record<string, unknown> };
    const runtimeRequire = createRequire(modulePath);
    const evaluateModule = new Function(
      'exports',
      'require',
      'module',
      '__filename',
      '__dirname',
      'getFeatureSelection',
      compiled,
    );

    evaluateModule(
      module.exports,
      runtimeRequire,
      module,
      modulePath,
      path.dirname(modulePath),
      getFeatureSelection,
    );

    return module.exports as OpenApiModule;
  } catch {
    return null;
  }
}

function getLocalOpenApiModulePaths(): string[] {
  const candidatePaths = new Set<string>();

  candidatePaths.add(path.resolve(process.cwd(), 'docs/private-local/openapi.full.ts'));

  if (process.argv[1]) {
    candidatePaths.add(
      path.resolve(path.dirname(process.argv[1]), '../docs/private-local/openapi.full.ts'),
    );
  }

  return [...candidatePaths];
}

function isOpenApiDocument(value: unknown): value is OpenAPIV3.Document {
  return value !== null && typeof value === 'object' && 'openapi' in value && 'paths' in value;
}

function annotateInternalOnlyDocument(document: OpenAPIV3.Document): OpenAPIV3.Document {
  const description = document.info.description?.trim();
  const nextDescription = description
    ? `${INTERNAL_ONLY_DOCS_WARNING}\n\n${description}`
    : INTERNAL_ONLY_DOCS_WARNING;

  const annotatedDocument: InternalOnlyOpenApiDocument = {
    ...document,
    [INTERNAL_ONLY_DOCS_EXTENSION]: true,
    info: {
      ...document.info,
      description: nextDescription,
    },
  };

  return annotatedDocument;
}

export function loadRuntimeOpenApiDocument(
  options: RuntimeOpenApiLoaderOptions = {},
): OpenAPIV3.Document {
  const requireFn = options.requireFn ?? requireForDocs;
  const modulePaths = options.modulePath ? [options.modulePath] : getLocalOpenApiModulePaths();

  for (const modulePath of modulePaths) {
    try {
      const loadedModule =
        (requireFn(modulePath) as OpenApiModule) ?? loadTranspiledModule(modulePath);

      if (isOpenApiDocument(loadedModule.openApiDocument)) {
        return annotateInternalOnlyDocument(loadedModule.openApiDocument);
      }

      if (typeof loadedModule.createOpenApiDocument === 'function') {
        const createdDocument = loadedModule.createOpenApiDocument();
        if (isOpenApiDocument(createdDocument)) {
          return annotateInternalOnlyDocument(createdDocument);
        }
      }

      if (isOpenApiDocument(loadedModule.default)) {
        return annotateInternalOnlyDocument(loadedModule.default);
      }
    } catch {
      const transpiledModule = loadTranspiledModule(modulePath);

      if (!transpiledModule) {
        continue;
      }

      if (isOpenApiDocument(transpiledModule.openApiDocument)) {
        return annotateInternalOnlyDocument(transpiledModule.openApiDocument);
      }

      if (typeof transpiledModule.createOpenApiDocument === 'function') {
        const createdDocument = transpiledModule.createOpenApiDocument();
        if (isOpenApiDocument(createdDocument)) {
          return annotateInternalOnlyDocument(createdDocument);
        }
      }

      if (isOpenApiDocument(transpiledModule.default)) {
        return annotateInternalOnlyDocument(transpiledModule.default);
      }
    }
  }

  return placeholderOpenApiDocument;
}
