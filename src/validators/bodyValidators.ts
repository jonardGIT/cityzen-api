import { body } from 'express-validator';
import { USER_ROLES } from '../types/auth.js';

export const createCitizenValidator = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('contactInfo').isString().trim().notEmpty().withMessage('contactInfo is required'),
  body('preferredChannel').isString().trim().notEmpty().withMessage('preferredChannel is required'),
];

export const updateCitizenValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['name', 'contactInfo', 'preferredChannel'].some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error('at least one of name, contactInfo, or preferredChannel is required');
    }
    return true;
  }),
  body('name').optional().isString().trim().notEmpty().withMessage('name must be a non-empty string'),
  body('contactInfo').optional().isString().trim().notEmpty().withMessage('contactInfo must be a non-empty string'),
  body('preferredChannel').optional().isString().trim().notEmpty().withMessage('preferredChannel must be a non-empty string'),
];

export const linkMyCitizenProfileValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['name', 'preferredChannel'].some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error('at least one of name or preferredChannel is required');
    }
    return true;
  }),
  body('contactInfo').not().exists().withMessage('contactInfo is managed from authenticated account email'),
  body('name').optional().isString().trim().notEmpty().withMessage('name must be a non-empty string'),
  body('preferredChannel').optional().isString().trim().notEmpty().withMessage('preferredChannel must be a non-empty string'),
];

export const createResponderValidator = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('agencyId').isInt({ min: 1 }).toInt().withMessage('agencyId must be a positive integer'),
  body('role').isString().trim().notEmpty().withMessage('role is required'),
  body('contactInfo').isString().trim().notEmpty().withMessage('contactInfo is required'),
];

export const updateResponderValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['name', 'agencyId', 'role', 'contactInfo'].some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error('at least one of name, agencyId, role, or contactInfo is required');
    }
    return true;
  }),
  body('name').optional().isString().trim().notEmpty().withMessage('name must be a non-empty string'),
  body('agencyId').optional().isInt({ min: 1 }).toInt().withMessage('agencyId must be a positive integer'),
  body('role').optional().isString().trim().notEmpty().withMessage('role must be a non-empty string'),
  body('contactInfo').optional().isString().trim().notEmpty().withMessage('contactInfo must be a non-empty string'),
];

export const createAgencyValidator = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('contactNumber')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 20 })
    .withMessage('contactNumber must be a string with maximum 20 characters'),
];

export const updateAgencyValidator = [
  body().custom((value) => {
    if (value?.name === undefined) {
      throw new Error('name is required');
    }
    return true;
  }),
  body('name').isString().trim().notEmpty().withMessage('name must be a non-empty string'),
  body('contactNumber')
    .optional({ nullable: true })
    .if((value) => value !== null && value !== undefined)
    .isString()
    .trim()
    .isLength({ max: 20 })
    .withMessage('contactNumber must be a string with maximum 20 characters'),
];

export const createStatusValidator = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
];

export const updateStatusValidator = [
  body().custom((value) => {
    if (value?.name === undefined) {
      throw new Error('name is required');
    }
    return true;
  }),
  body('name').isString().trim().notEmpty().withMessage('name must be a non-empty string'),
];

export const createCategoryValidator = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('subCategory').optional().isString().withMessage('subCategory must be a string'),
];

export const updateCategoryValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['name', 'subCategory'].some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error('at least one of name or subCategory is required');
    }
    return true;
  }),
  body('name').optional().isString().trim().notEmpty().withMessage('name must be a non-empty string'),
  body('subCategory').optional({ nullable: true }).isString().withMessage('subCategory must be a string'),
];

export const createSeverityValidator = [
  body('level').isString().trim().notEmpty().withMessage('level is required'),
  body('definition').optional().isString().withMessage('definition must be a string'),
];

export const updateSeverityValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['level', 'definition'].some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error('at least one of level or definition is required');
    }
    return true;
  }),
  body('level').optional().isString().trim().notEmpty().withMessage('level must be a non-empty string'),
  body('definition').optional({ nullable: true }).isString().withMessage('definition must be a string'),
];

export const createLocationValidator = [
  body('district').isString().trim().notEmpty().withMessage('district is required'),
  body('city').isString().trim().notEmpty().withMessage('city is required'),
  body('province').isString().trim().notEmpty().withMessage('province is required'),
  body('region').isString().trim().notEmpty().withMessage('region is required'),
];

export const updateLocationValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['district', 'city', 'province', 'region'].some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error('at least one of district, city, province, or region is required');
    }
    return true;
  }),
  body('district').optional().isString().trim().notEmpty().withMessage('district must be a non-empty string'),
  body('city').optional().isString().trim().notEmpty().withMessage('city must be a non-empty string'),
  body('province').optional().isString().trim().notEmpty().withMessage('province must be a non-empty string'),
  body('region').optional().isString().trim().notEmpty().withMessage('region must be a non-empty string'),
];

export const createIncidentValidator = [
  body('description').isString().trim().notEmpty().withMessage('description is required'),
  body('mediaUrl').optional().isString().withMessage('mediaUrl must be a string'),
  body('dateReported').optional().isISO8601().withMessage('dateReported must be an ISO8601 date'),
  body('statusId').isInt({ min: 1 }).toInt().withMessage('statusId must be a positive integer'),
  body('citizenId').isInt({ min: 1 }).toInt().withMessage('citizenId must be a positive integer'),
  body('locationId').isInt({ min: 1 }).toInt().withMessage('locationId must be a positive integer'),
  body('categoryId').isInt({ min: 1 }).toInt().withMessage('categoryId must be a positive integer'),
  body('severityId').isInt({ min: 1 }).toInt().withMessage('severityId must be a positive integer'),
];

export const createCitizenIncidentReportValidator = [
  body('description').isString().trim().notEmpty().withMessage('description is required'),
  body('mediaUrl').optional().isString().withMessage('mediaUrl must be a string'),
  body('dateReported').optional().isISO8601().withMessage('dateReported must be an ISO8601 date'),
  body('citizenId').not().exists().withMessage('citizenId is inferred from authenticated account context'),
  body('statusId').not().exists().withMessage('statusId is automatically set to Reported'),
  body('locationId').isInt({ min: 1 }).toInt().withMessage('locationId must be a positive integer'),
  body('categoryId').isInt({ min: 1 }).toInt().withMessage('categoryId must be a positive integer'),
  body('severityId').isInt({ min: 1 }).toInt().withMessage('severityId must be a positive integer'),
];

export const updateIncidentValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['description', 'mediaUrl', 'dateReported', 'statusId', 'citizenId', 'locationId', 'categoryId', 'severityId']
      .some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error('at least one updatable incident field is required');
    }
    return true;
  }),
  body('description').optional().isString().trim().notEmpty().withMessage('description must be a non-empty string'),
  body('mediaUrl').optional().isString().withMessage('mediaUrl must be a string'),
  body('dateReported').optional().isISO8601().withMessage('dateReported must be an ISO8601 date'),
  body('statusId').optional().isInt({ min: 1 }).toInt().withMessage('statusId must be a positive integer'),
  body('citizenId').optional().isInt({ min: 1 }).toInt().withMessage('citizenId must be a positive integer'),
  body('locationId').optional().isInt({ min: 1 }).toInt().withMessage('locationId must be a positive integer'),
  body('categoryId').optional().isInt({ min: 1 }).toInt().withMessage('categoryId must be a positive integer'),
  body('severityId').optional().isInt({ min: 1 }).toInt().withMessage('severityId must be a positive integer'),
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

export const updateAssignmentValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['incidentId', 'responderId', 'assignedDate', 'responseStart', 'responseEnd', 'outcome', 'notes']
      .some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error('at least one updatable assignment field is required');
    }
    return true;
  }),
  body('incidentId').optional().isInt({ min: 1 }).withMessage('incidentId must be a positive integer'),
  body('responderId').optional().isInt({ min: 1 }).withMessage('responderId must be a positive integer'),
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