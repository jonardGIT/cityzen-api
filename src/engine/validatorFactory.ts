import { body, type ValidationChain } from 'express-validator';
import type { RequestHandler } from 'express';
import type { FieldConfig } from './types.js';

function formatFieldList(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, or ${names[names.length - 1]}`;
}

function buildCreateChain(field: FieldConfig): ValidationChain {
  if (field.requiredOnCreate) {
    let chain = body(field.name)
      .isString()
      .trim()
      .notEmpty()
      .withMessage(`${field.name} is required`);
    if (field.maxLength) {
      chain = chain
        .isLength({ max: field.maxLength })
        .withMessage(`${field.name} must be a string with maximum ${field.maxLength} characters`);
    }
    return chain;
  }

  let chain = body(field.name).optional().isString();
  if (field.trim) chain = chain.trim();
  if (field.maxLength) {
    chain = chain
      .isLength({ max: field.maxLength })
      .withMessage(`${field.name} must be a string with maximum ${field.maxLength} characters`);
  } else {
    chain = chain.withMessage(`${field.name} must be a string`);
  }
  return chain;
}

function buildUpdateChain(field: FieldConfig): ValidationChain {
  if (field.requiredOnUpdate) {
    let chain = body(field.name)
      .isString()
      .trim()
      .notEmpty()
      .withMessage(`${field.name} must be a non-empty string`);
    if (field.maxLength) {
      chain = chain
        .isLength({ max: field.maxLength })
        .withMessage(`${field.name} must be a string with maximum ${field.maxLength} characters`);
    }
    return chain;
  }

  let chain: ValidationChain;
  if (field.nullable) {
    chain = body(field.name).optional({ nullable: true }).isString();
  } else {
    chain = body(field.name).optional().isString().trim().notEmpty();
  }

  if (field.trim && field.nullable) chain = chain.trim();

  if (field.maxLength) {
    chain = chain
      .isLength({ max: field.maxLength })
      .withMessage(`${field.name} must be a string with maximum ${field.maxLength} characters`);
  } else if (field.nullable) {
    chain = chain.withMessage(`${field.name} must be a string`);
  } else {
    chain = chain.withMessage(`${field.name} must be a non-empty string`);
  }
  return chain;
}

export interface CrudValidators {
  create: RequestHandler[];
  update: RequestHandler[];
}

export function createBodyValidators(fields: FieldConfig[]): CrudValidators {
  const create: ValidationChain[] = fields.map(buildCreateChain);

  const update: (ValidationChain | RequestHandler)[] = [];

  const requiredOnUpdateFields = fields.filter((f) => f.requiredOnUpdate);
  if (requiredOnUpdateFields.length > 0) {
    for (const field of requiredOnUpdateFields) {
      update.push(
        body().custom((value) => {
          if (value?.[field.name] === undefined) {
            throw new Error(`${field.name} is required`);
          }
          return true;
        }),
      );
    }
  } else {
    const fieldNames = fields.map((f) => f.name);
    update.push(
      body().custom((value) => {
        const hasField = fieldNames.some((name) => value?.[name] !== undefined);
        if (!hasField) {
          throw new Error(`at least one of ${formatFieldList(fieldNames)} is required`);
        }
        return true;
      }),
    );
  }

  for (const field of fields) {
    update.push(buildUpdateChain(field));
  }

  return {
    create: create as RequestHandler[],
    update: update as RequestHandler[],
  };
}
