import { body, type ValidationChain } from 'express-validator';

function hasOwnField(bodyValue: unknown, field: string): boolean {
  return Boolean(
    bodyValue &&
      typeof bodyValue === 'object' &&
      !Array.isArray(bodyValue) &&
      Object.prototype.hasOwnProperty.call(bodyValue, field),
  );
}

function getTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function hasAnySplitNameField(bodyValue: unknown): boolean {
  return ['firstName', 'middleName', 'lastName', 'suffix'].some((field) => hasOwnField(bodyValue, field));
}

function addNullByteGuard(chain: ValidationChain, fieldName: string): ValidationChain {
  return chain
    .custom((value) => typeof value !== 'string' || !value.includes('\0'))
    .withMessage(`${fieldName} must not contain null bytes`);
}

function buildOptionalLegacyNameFieldChain(): ValidationChain {
  return addNullByteGuard(
    body('name')
      .optional({ nullable: true })
      .isString()
      .trim()
      .notEmpty()
      .withMessage('name must be a non-empty string'),
    'name',
  );
}

function buildOptionalNameFieldChain(
  fieldName: 'firstName' | 'middleName' | 'lastName' | 'suffix',
): ValidationChain {
  return addNullByteGuard(
    body(fieldName)
      .optional({ nullable: true })
      .isString()
      .trim()
      .notEmpty()
      .withMessage(`${fieldName} must be a non-empty string`),
    fieldName,
  );
}

function buildCreateNameRequirementChain(
  fieldName: 'firstName' | 'lastName',
  counterpartFieldName: 'firstName' | 'lastName',
): ValidationChain {
  return addNullByteGuard(
    body(fieldName).custom((value, { req }) => {
      const payload = req.body;
      const hasSplitNameFields = hasAnySplitNameField(payload);
      const legacyName = getTrimmedString(payload?.name);
      const fieldValue = getTrimmedString(value);
      const counterpartValue = getTrimmedString(payload?.[counterpartFieldName]);

      if (hasOwnField(payload, fieldName) && (typeof value !== 'string' || !fieldValue)) {
        throw new Error(`${fieldName} must be a non-empty string`);
      }

      if (!hasSplitNameFields && legacyName) {
        return true;
      }

      if (!fieldValue && !counterpartValue) {
        throw new Error(`${fieldName} is required`);
      }

      if (!fieldValue && counterpartValue) {
        throw new Error(`${fieldName} is required when ${counterpartFieldName} is provided`);
      }

      return true;
    }),
    fieldName,
  );
}

function buildUpdateNameRequirementChain(
  fieldName: 'firstName' | 'lastName',
  counterpartFieldName: 'firstName' | 'lastName',
): ValidationChain {
  return addNullByteGuard(
    body(fieldName).custom((value, { req }) => {
      const payload = req.body;
      const hasSplitNameFields = hasAnySplitNameField(payload);
      const fieldValue = getTrimmedString(value);
      const counterpartValue = getTrimmedString(payload?.[counterpartFieldName]);

      if (hasOwnField(payload, fieldName) && (typeof value !== 'string' || !fieldValue)) {
        throw new Error(`${fieldName} must be a non-empty string`);
      }

      if (!hasSplitNameFields) {
        return true;
      }

      if (!fieldValue && counterpartValue) {
        throw new Error(`${fieldName} is required when ${counterpartFieldName} is provided`);
      }

      return true;
    }),
    fieldName,
  );
}

export function buildCanonicalNameCreateValidators(): ValidationChain[] {
  return [
    buildOptionalLegacyNameFieldChain(),
    buildCreateNameRequirementChain('firstName', 'lastName'),
    buildOptionalNameFieldChain('middleName'),
    buildCreateNameRequirementChain('lastName', 'firstName'),
    buildOptionalNameFieldChain('suffix'),
  ];
}

export function buildCanonicalNameUpdateValidators(): ValidationChain[] {
  return [
    buildOptionalLegacyNameFieldChain(),
    buildUpdateNameRequirementChain('firstName', 'lastName'),
    buildOptionalNameFieldChain('firstName'),
    buildOptionalNameFieldChain('middleName'),
    buildUpdateNameRequirementChain('lastName', 'firstName'),
    buildOptionalNameFieldChain('lastName'),
    buildOptionalNameFieldChain('suffix'),
  ];
}