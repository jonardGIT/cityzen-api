import { body } from 'express-validator';
import { USER_ROLES } from '../types/auth.js';

const INCIDENT_LOCATION_SNAPSHOT_FIELDS = [
  'latitude',
  'longitude',
  'addressLine1',
  'cityName',
  'provinceName',
  'regionName',
] as const;

const INCIDENT_LOCALITY_ID_FIELDS = [
  'regionId',
  'provinceId',
  'cityMunicipalityId',
  'barangayId',
] as const;

function hasIncidentLocationSnapshot(value: Record<string, unknown> | undefined): boolean {
  return INCIDENT_LOCATION_SNAPSHOT_FIELDS.some((field) => value?.[field] !== undefined);
}

const incidentLocationFieldsValidator = [
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('latitude must be a valid latitude between -90 and 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('longitude must be a valid longitude between -180 and 180'),
  body('addressLine1')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('addressLine1 must be a non-empty string'),
  body('addressLine2')
    .optional({ nullable: true })
    .isString()
    .withMessage('addressLine2 must be a string'),
  body('barangay').optional({ nullable: true }).isString().withMessage('barangay must be a string'),
  body('districtName')
    .optional({ nullable: true })
    .isString()
    .withMessage('districtName must be a string'),
  body('cityName')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('cityName must be a non-empty string'),
  body('provinceName')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('provinceName must be a non-empty string'),
  body('regionName')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('regionName must be a non-empty string'),
  body('postalCode')
    .optional({ nullable: true })
    .isString()
    .withMessage('postalCode must be a string'),
  body('landmark').optional({ nullable: true }).isString().withMessage('landmark must be a string'),
  body().custom((value) => {
    const hasSnapshot = hasIncidentLocationSnapshot(value);

    if (!hasSnapshot) {
      throw new Error('incident location snapshot fields are required');
    }

    if (hasSnapshot) {
      const missingSnapshotFields = INCIDENT_LOCATION_SNAPSHOT_FIELDS.filter(
        (field) => value?.[field] === undefined || value?.[field] === null || value?.[field] === '',
      );

      if (missingSnapshotFields.length > 0) {
        throw new Error(`incident location snapshot requires ${missingSnapshotFields.join(', ')}`);
      }
    }

    return true;
  }),
];

const incidentCanonicalLocalityIdFieldsValidator = INCIDENT_LOCALITY_ID_FIELDS.map((field) =>
  body(field).optional({ nullable: true }).isUUID().withMessage(`${field} must be a valid UUID`),
);

const forbiddenIncidentCanonicalLocalityIdFieldsValidator = INCIDENT_LOCALITY_ID_FIELDS.map(
  (field) =>
    body(field).custom((_, { req }) => {
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, field)) {
        throw new Error(`${field} is derived from the incident location snapshot`);
      }

      return true;
    }),
);

const updateIncidentLocationFieldsValidator = [
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('latitude must be a valid latitude between -90 and 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('longitude must be a valid longitude between -180 and 180'),
  body('addressLine1')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('addressLine1 must be a non-empty string'),
  body('addressLine2')
    .optional({ nullable: true })
    .isString()
    .withMessage('addressLine2 must be a string'),
  body('barangay').optional({ nullable: true }).isString().withMessage('barangay must be a string'),
  body('districtName')
    .optional({ nullable: true })
    .isString()
    .withMessage('districtName must be a string'),
  body('cityName')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('cityName must be a non-empty string'),
  body('provinceName')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('provinceName must be a non-empty string'),
  body('regionName')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('regionName must be a non-empty string'),
  body('postalCode')
    .optional({ nullable: true })
    .isString()
    .withMessage('postalCode must be a string'),
  body('landmark').optional({ nullable: true }).isString().withMessage('landmark must be a string'),
  body().custom((value) => {
    const hasSnapshot = hasIncidentLocationSnapshot(value);

    if (!hasSnapshot) {
      return true;
    }

    const missingSnapshotFields = INCIDENT_LOCATION_SNAPSHOT_FIELDS.filter(
      (field) => value?.[field] === undefined || value?.[field] === null || value?.[field] === '',
    );

    if (missingSnapshotFields.length > 0) {
      throw new Error(`incident location snapshot requires ${missingSnapshotFields.join(', ')}`);
    }

    return true;
  }),
];

export const linkMyCitizenProfileValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['name', 'preferredChannel'].some(
      (field) => value?.[field] !== undefined,
    );
    if (!hasUpdatableField) {
      throw new Error('at least one of name or preferredChannel is required');
    }
    return true;
  }),
  body('contactInfo')
    .not()
    .exists()
    .withMessage('contactInfo is managed from authenticated account email'),
  body('name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('name must be a non-empty string'),
  body('preferredChannel')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('preferredChannel must be a non-empty string'),
];

export const createLocationValidator = [
  body('district').isString().trim().notEmpty().withMessage('district is required'),
  body('city').isString().trim().notEmpty().withMessage('city is required'),
  body('province').isString().trim().notEmpty().withMessage('province is required'),
  body('region').isString().trim().notEmpty().withMessage('region is required'),
];

export const updateLocationValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['district', 'city', 'province', 'region'].some(
      (field) => value?.[field] !== undefined,
    );
    if (!hasUpdatableField) {
      throw new Error('at least one of district, city, province, or region is required');
    }
    return true;
  }),
  body('district')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('district must be a non-empty string'),
  body('city')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('city must be a non-empty string'),
  body('province')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('province must be a non-empty string'),
  body('region')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('region must be a non-empty string'),
];

export const createIncidentValidator = [
  body('description').isString().trim().notEmpty().withMessage('description is required'),
  body('mediaUrl').optional().isString().withMessage('mediaUrl must be a string'),
  body('mediaUrls')
    .optional()
    .isArray({ min: 1 })
    .withMessage('mediaUrls must be a non-empty array'),
  body('mediaUrls.*')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('mediaUrls entries must be non-empty strings'),
  body('dateReported').optional().isISO8601().withMessage('dateReported must be an ISO8601 date'),
  body('statusId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('statusId is required and must be a string'),
  body('citizenId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('citizenId is required and must be a string'),
  body('categoryId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('categoryId is required and must be a string'),
  body('severityId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('severityId is required and must be a string'),
  ...incidentCanonicalLocalityIdFieldsValidator,
  ...incidentLocationFieldsValidator,
];

export const createCitizenIncidentReportValidator = [
  body('description').isString().trim().notEmpty().withMessage('description is required'),
  body('mediaUrl').optional().isString().withMessage('mediaUrl must be a string'),
  body('mediaUrls')
    .optional()
    .isArray({ min: 1 })
    .withMessage('mediaUrls must be a non-empty array'),
  body('mediaUrls.*')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('mediaUrls entries must be non-empty strings'),
  body('dateReported').optional().isISO8601().withMessage('dateReported must be an ISO8601 date'),
  body('citizenId')
    .not()
    .exists()
    .withMessage('citizenId is inferred from authenticated account context'),
  body('statusId').not().exists().withMessage('statusId is automatically set to Reported'),
  body('categoryId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('categoryId is required and must be a string'),
  body('severityId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('severityId is required and must be a string'),
  ...forbiddenIncidentCanonicalLocalityIdFieldsValidator,
  ...incidentLocationFieldsValidator,
];

export const uploadIncidentMediaValidator = [
  body().custom((value) => {
    const hasSingleFileFields =
      typeof value?.fileName === 'string' &&
      typeof value?.contentType === 'string' &&
      typeof value?.dataBase64 === 'string';
    const hasFilesArray = Array.isArray(value?.files) && value.files.length > 0;

    if (!hasSingleFileFields && !hasFilesArray) {
      throw new Error(
        'either fileName/contentType/dataBase64 or a non-empty files array is required',
      );
    }

    return true;
  }),
  body('fileName').optional().isString().trim().notEmpty().withMessage('fileName is required'),
  body('contentType')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('contentType is required'),
  body('dataBase64').optional().isString().trim().notEmpty().withMessage('dataBase64 is required'),
  body('files').optional().isArray({ min: 1 }).withMessage('files must be a non-empty array'),
  body('files.*.fileName')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('fileName is required'),
  body('files.*.contentType')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('contentType is required'),
  body('files.*.dataBase64')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('dataBase64 is required'),
  body('incidentId').optional().isUUID().withMessage('incidentId must be a valid UUID'),
];

export const updateIncidentValidator = [
  body().custom((value) => {
    const hasUpdatableField = [
      'description',
      'mediaUrl',
      'mediaUrls',
      'dateReported',
      'statusId',
      'citizenId',
      'categoryId',
      'severityId',
      'barangay',
      ...INCIDENT_LOCATION_SNAPSHOT_FIELDS,
      ...INCIDENT_LOCALITY_ID_FIELDS,
    ].some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error('at least one updatable incident field is required');
    }
    return true;
  }),
  body('description')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('description must be a non-empty string'),
  body('mediaUrl').optional().isString().withMessage('mediaUrl must be a string'),
  body('mediaUrls')
    .optional()
    .isArray({ min: 1 })
    .withMessage('mediaUrls must be a non-empty array'),
  body('mediaUrls.*')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('mediaUrls entries must be non-empty strings'),
  body('dateReported').optional().isISO8601().withMessage('dateReported must be an ISO8601 date'),
  body('statusId')
    .optional()
    .isString()
    .trim()
    .isUUID()
    .withMessage('statusId must be a valid UUID'),
  body('citizenId')
    .optional()
    .isString()
    .trim()
    .isUUID()
    .withMessage('citizenId must be a valid UUID'),
  body('categoryId')
    .optional()
    .isString()
    .trim()
    .isUUID()
    .withMessage('categoryId must be a valid UUID'),
  body('severityId')
    .optional()
    .isString()
    .trim()
    .isUUID()
    .withMessage('severityId must be a valid UUID'),
  ...incidentCanonicalLocalityIdFieldsValidator,
  ...updateIncidentLocationFieldsValidator,
];

export const createAssignmentValidator = [
  body('incidentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('incidentId is required and must be a string'),
  body('responderId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('responderId is required and must be a string'),
  body('assignedDate').optional().isISO8601().withMessage('assignedDate must be an ISO8601 date'),
  body('responseStart').optional().isISO8601().withMessage('responseStart must be an ISO8601 date'),
  body('responseEnd').optional().isISO8601().withMessage('responseEnd must be an ISO8601 date'),
  body('outcome').optional().isString().withMessage('outcome must be a string'),
  body('notes').optional().isString().withMessage('notes must be a string'),
];

export const updateAssignmentValidator = [
  body().custom((value) => {
    const hasUpdatableField = [
      'incidentId',
      'responderId',
      'assignedDate',
      'responseStart',
      'responseEnd',
      'outcome',
      'notes',
    ].some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error(
        'at least one of incidentId, responderId, assignedDate, responseStart, responseEnd, outcome, or notes is required',
      );
    }
    return true;
  }),
  body('incidentId')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('incidentId must be a non-empty string'),
  body('responderId')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('responderId must be a non-empty string'),
  body('assignedDate').optional().isISO8601().withMessage('assignedDate must be an ISO8601 date'),
  body('responseStart').optional().isISO8601().withMessage('responseStart must be an ISO8601 date'),
  body('responseEnd').optional().isISO8601().withMessage('responseEnd must be an ISO8601 date'),
  body('outcome').optional().isString().withMessage('outcome must be a string'),
  body('notes').optional().isString().withMessage('notes must be a string'),
];

// Duplicate removed. Only one export for updateIncidentValidator should exist.
export const createUserValidator = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('email').isEmail().withMessage('email must be a valid email address'),
  body('password')
    .isString()
    .isLength({ min: 12 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    .withMessage(
      'password must be at least 12 characters and include uppercase, lowercase, number, and special character',
    ),
  body('role')
    .optional()
    .isString()
    .custom((value) =>
      USER_ROLES.includes(
        value
          .trim()
          .toUpperCase()
          .replace(/[\s-]+/g, '_'),
      ),
    )
    .withMessage(
      'role must be one of NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_ADMIN, DISPATCHER, RESPONDER, CITIZEN_REPORTER, AUDITOR',
    ),
];

export const updateUserValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['name', 'email', 'password', 'role'].some(
      (field) => value?.[field] !== undefined,
    );
    if (!hasUpdatableField) {
      throw new Error('at least one of name, email, password, or role is required');
    }
    return true;
  }),
  body('name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('name must be a non-empty string'),
  body('email').optional().isEmail().withMessage('email must be a valid email address'),
  body('password')
    .optional()
    .isString()
    .isLength({ min: 12 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    .withMessage(
      'password must be at least 12 characters and include uppercase, lowercase, number, and special character',
    ),
  body('role')
    .optional()
    .isString()
    .custom((value) =>
      USER_ROLES.includes(
        value
          .trim()
          .toUpperCase()
          .replace(/[\s-]+/g, '_'),
      ),
    )
    .withMessage(
      'role must be one of NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_ADMIN, DISPATCHER, RESPONDER, CITIZEN_REPORTER, AUDITOR',
    ),
];
