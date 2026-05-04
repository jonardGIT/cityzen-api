import { body, type ValidationChain } from 'express-validator';

function addNullByteGuard(chain: ValidationChain, fieldName: string): ValidationChain {
  return chain
    .custom((value) => typeof value !== 'string' || !value.includes('\0'))
    .withMessage(`${fieldName} must not contain null bytes`);
}

function buildRequiredNameFieldChain(fieldName: 'firstName' | 'lastName'): ValidationChain {
  return addNullByteGuard(
    body(fieldName)
      .exists()
      .withMessage(`${fieldName} is required`)
      .bail()
      .isString()
      .trim()
      .notEmpty()
      .withMessage(`${fieldName} must be a non-empty string`),
    fieldName,
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

function buildRejectLegacyNameValidator(): ValidationChain {
  return body().custom((value) => {
    if (Object.prototype.hasOwnProperty.call(value ?? {}, 'name')) {
      throw new Error('name is not supported; use firstName and lastName');
    }

    return true;
  });
}

export function buildCanonicalNameCreateValidators(): ValidationChain[] {
  return [
    buildRejectLegacyNameValidator(),
    buildRequiredNameFieldChain('firstName'),
    buildOptionalNameFieldChain('middleName'),
    buildRequiredNameFieldChain('lastName'),
    buildOptionalNameFieldChain('suffix'),
  ];
}

export function buildCanonicalNameUpdateValidators(): ValidationChain[] {
  return [
    buildRejectLegacyNameValidator(),
    buildOptionalNameFieldChain('firstName'),
    buildOptionalNameFieldChain('middleName'),
    buildOptionalNameFieldChain('lastName'),
    buildOptionalNameFieldChain('suffix'),
  ];
}