import prisma from '../lib/prisma.js';

const BASELINE_INCIDENT_CATEGORIES = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    name: 'Fire Incident',
    subCategory: 'Residential Structure',
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    name: 'Medical Emergency',
    subCategory: 'Patient Transport',
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    name: 'Road Accident',
    subCategory: 'Vehicle Collision',
  },
  {
    id: '30000000-0000-0000-0000-000000000004',
    name: 'Flooding',
    subCategory: 'Urban Drainage Overflow',
  },
  {
    id: '30000000-0000-0000-0000-000000000005',
    name: 'Public Safety',
    subCategory: 'Crowd Control or Safety Risk',
  },
] as const;

const BASELINE_INCIDENT_SEVERITIES = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    level: 'Low',
    definition: 'Minimal impact; monitoring only.',
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    level: 'Moderate',
    definition: 'Standard response required.',
  },
  {
    id: '40000000-0000-0000-0000-000000000003',
    level: 'High',
    definition: 'Priority response required.',
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    level: 'Critical',
    definition: 'Immediate intervention required.',
  },
] as const;

export async function ensureBaselineIncidentCategories() {
  const activeCategoryCount = await prisma.category.count({
    where: { archivedAt: null },
  });

  if (activeCategoryCount > 0) {
    return;
  }

  for (const category of BASELINE_INCIDENT_CATEGORIES) {
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: category.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      if (
        existingCategory.archivedAt !== null ||
        existingCategory.subCategory !== category.subCategory
      ) {
        await prisma.category.update({
          where: { id: existingCategory.id },
          data: {
            archivedAt: null,
            subCategory: category.subCategory,
          },
        });
      }

      continue;
    }

    await prisma.category.create({
      data: {
        id: category.id,
        name: category.name,
        subCategory: category.subCategory,
      },
    });
  }
}

export async function ensureBaselineIncidentSeverities() {
  const activeSeverityCount = await prisma.severity.count({
    where: { archivedAt: null },
  });

  if (activeSeverityCount > 0) {
    return;
  }

  for (const severity of BASELINE_INCIDENT_SEVERITIES) {
    const existingSeverity = await prisma.severity.findFirst({
      where: {
        level: {
          equals: severity.level,
          mode: 'insensitive',
        },
      },
    });

    if (existingSeverity) {
      if (
        existingSeverity.archivedAt !== null ||
        existingSeverity.definition !== severity.definition
      ) {
        await prisma.severity.update({
          where: { id: existingSeverity.id },
          data: {
            archivedAt: null,
            definition: severity.definition,
          },
        });
      }

      continue;
    }

    await prisma.severity.create({
      data: {
        id: severity.id,
        level: severity.level,
        definition: severity.definition,
      },
    });
  }
}
