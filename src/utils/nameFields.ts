export interface CanonicalNameFieldData {
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
}

function hasOwnField(body: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, field);
}

function getTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function getTrimmedNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  return getTrimmedString(value);
}

export function hasAnyCanonicalNameField(body: Record<string, unknown>): boolean {
  return ['firstName', 'middleName', 'lastName', 'suffix'].some((field) => hasOwnField(body, field));
}

export function buildCanonicalNameCreateData(
  body: Record<string, unknown>,
): CanonicalNameFieldData | null {
  const firstName = getTrimmedString(body.firstName);
  const lastName = getTrimmedString(body.lastName);

  if (!firstName || !lastName) {
    return null;
  }

  return {
    firstName,
    middleName: getTrimmedNullableString(body.middleName) ?? null,
    lastName,
    suffix: getTrimmedNullableString(body.suffix) ?? null,
  };
}

export function buildCanonicalNameUpdateData(
  body: Record<string, unknown>,
): Partial<CanonicalNameFieldData> {
  const data: Partial<CanonicalNameFieldData> = {};

  if (hasOwnField(body, 'firstName')) {
    const firstName = getTrimmedString(body.firstName);
    if (firstName) {
      data.firstName = firstName;
    }
  }

  if (hasOwnField(body, 'middleName')) {
    data.middleName = getTrimmedNullableString(body.middleName) ?? null;
  }

  if (hasOwnField(body, 'lastName')) {
    const lastName = getTrimmedString(body.lastName);
    if (lastName) {
      data.lastName = lastName;
    }
  }

  if (hasOwnField(body, 'suffix')) {
    data.suffix = getTrimmedNullableString(body.suffix) ?? null;
  }

  return data;
}

export function formatCanonicalDisplayName(
  fields: Partial<CanonicalNameFieldData>,
): string | null {
  const firstName = getTrimmedString(fields.firstName);
  const lastName = getTrimmedString(fields.lastName);

  if (!firstName || !lastName) {
    return null;
  }

  const middleName = getTrimmedString(fields.middleName);
  const suffix = getTrimmedString(fields.suffix);

  return [firstName, middleName, lastName, suffix].filter(Boolean).join(' ');
}