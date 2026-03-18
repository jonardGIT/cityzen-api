import { body } from 'express-validator';
import { USER_ROLES } from '../types/auth.js';

export const createCitizenValidator = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('contactInfo').isString().trim().notEmpty().withMessage('contactInfo is required'),
  body('preferredChannel').isString().trim().notEmpty().withMessage('preferredChannel is required'),
];

export const createResponderValidator = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('agency').isString().trim().notEmpty().withMessage('agency is required'),
  body('role').isString().trim().notEmpty().withMessage('role is required'),
  body('contactInfo').isString().trim().notEmpty().withMessage('contactInfo is required'),
];

export const createStatusValidator = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
];

export const createCategoryValidator = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('subCategory').optional().isString().withMessage('subCategory must be a string'),
];

export const createSeverityValidator = [
  body('level').isString().trim().notEmpty().withMessage('level is required'),
  body('definition').optional().isString().withMessage('definition must be a string'),
];

export const createLocationValidator = [
  body('district').isString().trim().notEmpty().withMessage('district is required'),
  body('city').isString().trim().notEmpty().withMessage('city is required'),
  body('province').isString().trim().notEmpty().withMessage('province is required'),
  body('region').isString().trim().notEmpty().withMessage('region is required'),
];

export const createIncidentValidator = [
  body('description').isString().trim().notEmpty().withMessage('description is required'),
  body('mediaUrl').optional().isString().withMessage('mediaUrl must be a string'),
  body('dateReported').optional().isISO8601().withMessage('dateReported must be an ISO8601 date'),
  body('statusId').isInt({ min: 1 }).withMessage('statusId must be a positive integer'),
  body('citizenId').isInt({ min: 1 }).withMessage('citizenId must be a positive integer'),
  body('locationId').isInt({ min: 1 }).withMessage('locationId must be a positive integer'),
  body('categoryId').isInt({ min: 1 }).withMessage('categoryId must be a positive integer'),
  body('severityId').isInt({ min: 1 }).withMessage('severityId must be a positive integer'),
];

export const createAssignmentValidator = [
  body('incidentId').isInt({ min: 1 }).withMessage('incidentId must be a positive integer'),
  body('responderId').isInt({ min: 1 }).withMessage('responderId must be a positive integer'),
  body('assignedDate').optional().isISO8601().withMessage('assignedDate must be an ISO8601 date'),
  body('responseStart').optional().isISO8601().withMessage('responseStart must be an ISO8601 date'),
  body('responseEnd').optional().isISO8601().withMessage('responseEnd must be an ISO8601 date'),
  body('outcome').optional().isString().withMessage('outcome must be a string'),
  body('notes').optional().isString().withMessage('notes must be a string'),
];

export const createUserValidator = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('email').isEmail().withMessage('email must be a valid email address'),
  body('password').isString().isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  body('role')
    .optional()
    .isString()
    .custom((value) => USER_ROLES.includes(value.toUpperCase()))
    .withMessage('role must be one of SUPER_ADMIN, ADMIN, DISPATCHER, RESPONDER, VIEWER'),
];

export const updateUserValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['name', 'email', 'password', 'role'].some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error('at least one of name, email, password, or role is required');
    }
    return true;
  }),
  body('name').optional().isString().trim().notEmpty().withMessage('name must be a non-empty string'),
  body('email').optional().isEmail().withMessage('email must be a valid email address'),
  body('password')
    .optional()
    .isString()
    .isLength({ min: 8 })
    .withMessage('password must be at least 8 characters'),
  body('role')
    .optional()
    .isString()
    .custom((value) => USER_ROLES.includes(value.toUpperCase()))
    .withMessage('role must be one of SUPER_ADMIN, ADMIN, DISPATCHER, RESPONDER, VIEWER'),
];