import { writeFile } from 'fs/promises';
import path from 'path';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outputPath = path.join(rootDir, 'prisma/seed-cagayan-province.sql');

const REGION_CODE = '020000000';
const PROVINCE_CODE = '021500000';
const REGION_NAME = 'Cagayan Valley';
const REGION_DESIGNATION = 'Region II';
const PROVINCE_NAME = 'Cagayan';

type PsgcLocality = {
  code: string;
  name: string;
  isCity: boolean;
};

type PsgcBarangay = {
  code: string;
  name: string;
};

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function buildBarangayInsert(
  localityCode: string,
  localityName: string,
  barangays: PsgcBarangay[],
): string {
  const values = barangays
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((barangay) => `  ('${barangay.code}', '${escapeSqlLiteral(barangay.name)}')`)
    .join(',\n');

  return `-- Barangays: ${escapeSqlLiteral(localityName)}\nWITH locality AS (\n  SELECT id\n  FROM cities_municipalities\n  WHERE code = '${localityCode}'\n)\nINSERT INTO barangays (id, code, name, \"cityMunicipalityId\", \"createdAt\", \"updatedAt\")\nSELECT gen_random_uuid(), v.code, v.name, locality.id, NOW(), NOW()\nFROM locality, (VALUES\n${values}\n) AS v(code, name)\nON CONFLICT (code) DO UPDATE\nSET\n  name = EXCLUDED.name,\n  \"cityMunicipalityId\" = EXCLUDED.\"cityMunicipalityId\",\n  \"updatedAt\" = NOW();`;
}

async function main(): Promise<void> {
  const generatedDate = new Date().toISOString().slice(0, 10);
  const localities = await fetchJson<PsgcLocality[]>(
    `https://psgc.gitlab.io/api/provinces/${PROVINCE_CODE}/cities-municipalities/`,
  );

  const localityValues = localities
    .sort((left, right) => left.code.localeCompare(right.code))
    .map(
      (locality) =>
        `  ('${locality.code}', '${escapeSqlLiteral(locality.name)}', '${
          locality.isCity ? 'CITY' : 'MUNICIPALITY'
        }')`,
    )
    .join(',\n');

  const barangayBlocks = await Promise.all(
    localities
      .sort((left, right) => left.code.localeCompare(right.code))
      .map(async (locality) => {
        const barangays = await fetchJson<PsgcBarangay[]>(
          `https://psgc.gitlab.io/api/cities-municipalities/${locality.code}/barangays/`,
        );

        return buildBarangayInsert(locality.code, locality.name, barangays);
      }),
  );

  const sql = `-- Seed data: complete Cagayan province localities and barangays (PSGC-based)\n-- Generated from https://psgc.gitlab.io/api on ${generatedDate}.\n\nBEGIN;\n\nINSERT INTO regions (id, code, name, designation, \"createdAt\", \"updatedAt\")\nVALUES (gen_random_uuid(), '${REGION_CODE}', '${REGION_NAME}', '${REGION_DESIGNATION}', NOW(), NOW())\nON CONFLICT (code) DO UPDATE\nSET\n  name = EXCLUDED.name,\n  designation = EXCLUDED.designation,\n  \"updatedAt\" = NOW();\n\nWITH region AS (\n  SELECT id\n  FROM regions\n  WHERE code = '${REGION_CODE}'\n)\nINSERT INTO provinces (id, code, name, \"regionId\", \"createdAt\", \"updatedAt\")\nSELECT gen_random_uuid(), '${PROVINCE_CODE}', '${PROVINCE_NAME}', region.id, NOW(), NOW()\nFROM region\nON CONFLICT (code) DO UPDATE\nSET\n  name = EXCLUDED.name,\n  \"regionId\" = EXCLUDED.\"regionId\",\n  \"updatedAt\" = NOW();\n\nWITH province AS (\n  SELECT id\n  FROM provinces\n  WHERE code = '${PROVINCE_CODE}'\n)\nINSERT INTO cities_municipalities (id, code, name, type, \"provinceId\", \"createdAt\", \"updatedAt\")\nSELECT gen_random_uuid(), v.code, v.name, v.type, province.id, NOW(), NOW()\nFROM province, (VALUES\n${localityValues}\n) AS v(code, name, type)\nON CONFLICT (code) DO UPDATE\nSET\n  name = EXCLUDED.name,\n  type = EXCLUDED.type,\n  \"provinceId\" = EXCLUDED.\"provinceId\",\n  \"updatedAt\" = NOW();\n\n${barangayBlocks.join('\n\n')}\n\nCOMMIT;\n`;

  await writeFile(outputPath, sql, 'utf8');
}

await main();
