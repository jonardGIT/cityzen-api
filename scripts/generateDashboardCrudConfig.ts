import { writeFile } from 'fs/promises';
import path from 'path';
import { dashboardCrudConfig, dashboardCrudConfigFlat } from '../src/docs/dashboardCrudContract.js';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const generatedFiles = [
  'docs/dashboard-crud-config.json',
  'docs/dashboard-crud-config.flat.json',
] as const;

async function writeJson(relativePath: string, value: unknown): Promise<void> {
  const outputPath = path.join(rootDir, relativePath);
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  await writeJson(generatedFiles[0], dashboardCrudConfig);
  await writeJson(generatedFiles[1], dashboardCrudConfigFlat);
}

await main();
