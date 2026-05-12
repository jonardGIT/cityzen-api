import { writeFile } from 'fs/promises';
import path from 'path';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const standaloneOutputPath = path.join(rootDir, 'prisma/seed-cagayan-province.sql');
const supplementOutputPath = path.join(rootDir, 'prisma/seed-cagayan-province-supplement.sql');

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

type ConflictMode = 'update' | 'nothing';

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function buildConflictClause(conflictMode: ConflictMode, assignments: string[]): string {
  if (conflictMode === 'nothing') {
    return 'ON CONFLICT (code) DO NOTHING';
  }

  return `ON CONFLICT (code) DO UPDATE\nSET\n${assignments.join(',\n')}`;
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
  conflictMode: ConflictMode,
): string {
  const values = barangays
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((barangay) => `  ('${barangay.code}', '${escapeSqlLiteral(barangay.name)}')`)
    .join(',\n');
  const conflictClause = buildConflictClause(conflictMode, [
    '  name = EXCLUDED.name',
    '  "cityMunicipalityId" = EXCLUDED."cityMunicipalityId"',
    '  "updatedAt" = NOW()',
  ]);

  return `-- Barangays: ${escapeSqlLiteral(localityName)}\nWITH locality AS (\n  SELECT id\n  FROM cities_municipalities\n  WHERE code = '${localityCode}'\n)\nINSERT INTO barangays (id, code, name, "cityMunicipalityId", "createdAt", "updatedAt")\nSELECT gen_random_uuid(), v.code, v.name, locality.id, NOW(), NOW()\nFROM locality, (VALUES\n${values}\n) AS v(code, name)\n${conflictClause};`;
}

function buildSeedSql(options: {
  generatedDate: string;
  localityValues: string;
  barangayBlocks: string[];
  conflictMode: ConflictMode;
  transactional: boolean;
}): string {
  const { generatedDate, localityValues, barangayBlocks, conflictMode, transactional } = options;
  const regionConflictClause = buildConflictClause(conflictMode, [
    '  name = EXCLUDED.name',
    '  designation = EXCLUDED.designation',
    '  "updatedAt" = NOW()',
  ]);
  const provinceConflictClause = buildConflictClause(conflictMode, [
    '  name = EXCLUDED.name',
    '  "regionId" = EXCLUDED."regionId"',
    '  "updatedAt" = NOW()',
  ]);
  const localityConflictClause = buildConflictClause(conflictMode, [
    '  name = EXCLUDED.name',
    '  type = EXCLUDED.type',
    '  "provinceId" = EXCLUDED."provinceId"',
    '  "updatedAt" = NOW()',
  ]);
  const transactionPrefix = transactional ? 'BEGIN;\n\n' : '';
  const transactionSuffix = transactional ? '\n\nCOMMIT;' : '';
  const modeComment =
    conflictMode === 'update'
      ? 'complete standalone seed with rerunnable upserts'
      : 'additive supplement for the default sample seed';

  return `-- Seed data: complete Cagayan province localities and barangays (PSGC-based)\n-- Generated from https://psgc.gitlab.io/api on ${generatedDate}.\n-- Mode: ${modeComment}.\n\n${transactionPrefix}INSERT INTO regions (id, code, name, designation, "createdAt", "updatedAt")\nVALUES (gen_random_uuid(), '${REGION_CODE}', '${REGION_NAME}', '${REGION_DESIGNATION}', NOW(), NOW())\n${regionConflictClause};\n\nWITH region AS (\n  SELECT id\n  FROM regions\n  WHERE code = '${REGION_CODE}'\n)\nINSERT INTO provinces (id, code, name, "regionId", "createdAt", "updatedAt")\nSELECT gen_random_uuid(), '${PROVINCE_CODE}', '${PROVINCE_NAME}', region.id, NOW(), NOW()\nFROM region\n${provinceConflictClause};\n\nWITH province AS (\n  SELECT id\n  FROM provinces\n  WHERE code = '${PROVINCE_CODE}'\n)\nINSERT INTO cities_municipalities (id, code, name, type, "provinceId", "createdAt", "updatedAt")\nSELECT gen_random_uuid(), v.code, v.name, v.type, province.id, NOW(), NOW()\nFROM province, (VALUES\n${localityValues}\n) AS v(code, name, type)\n${localityConflictClause};\n\n${barangayBlocks.join('\n\n')}${transactionSuffix}\n`;
}

async function main(): Promise<void> {
  const generatedDate = new Date().toISOString().slice(0, 10);
  const localities = await fetchJson<PsgcLocality[]>(
    `https://psgc.gitlab.io/api/provinces/${PROVINCE_CODE}/cities-municipalities/`,
  );

  const sortedLocalities = [...localities].sort((left, right) =>
    left.code.localeCompare(right.code),
  );
  const localityValues = sortedLocalities
    .map(
      (locality) =>
        `  ('${locality.code}', '${escapeSqlLiteral(locality.name)}', '${
          locality.isCity ? 'CITY' : 'MUNICIPALITY'
        }')`,
    )
    .join(',\n');

  const barangayBlocks = await Promise.all(
    sortedLocalities.map(async (locality) => {
      const barangays = await fetchJson<PsgcBarangay[]>(
        `https://psgc.gitlab.io/api/cities-municipalities/${locality.code}/barangays/`,
      );

      return {
        standalone: buildBarangayInsert(locality.code, locality.name, barangays, 'update'),
        supplement: buildBarangayInsert(locality.code, locality.name, barangays, 'nothing'),
      };
    }),
  );

  const standaloneSql = buildSeedSql({
    generatedDate,
    localityValues,
    barangayBlocks: barangayBlocks.map((block) => block.standalone),
    conflictMode: 'update',
    transactional: true,
  });
  const supplementSql = buildSeedSql({
    generatedDate,
    localityValues,
    barangayBlocks: barangayBlocks.map((block) => block.supplement),
    conflictMode: 'nothing',
    transactional: false,
  });

  await Promise.all([
    writeFile(standaloneOutputPath, standaloneSql, 'utf8'),
    writeFile(supplementOutputPath, supplementSql, 'utf8'),
  ]);
}

await main();
