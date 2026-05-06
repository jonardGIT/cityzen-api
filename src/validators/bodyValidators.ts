import { body } from 'express-validator';
import { USER_ROLES } from '../types/auth.js';
import {
  DATA_SUBJECT_REQUEST_STATUSES,
  DATA_SUBJECT_REQUEST_TYPES,
} from '../utils/privacyRequests.js';
import {
  PRIVACY_INCIDENT_SEVERITIES,
  PRIVACY_INCIDENT_STATUSES,
} from '../utils/privacyIncidents.js';
import {
  buildCanonicalNameCreateValidators,
  buildCanonicalNameUpdateValidators,
} from './nameFields.js';

export const POSTGRES_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPostgresUuid(value: unknown): boolean {
  return typeof value === 'string' && POSTGRES_UUID_REGEX.test(value.trim());
}

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
  body(field)
    .optional({ nullable: true })
    .custom((value) => isPostgresUuid(value))
    .withMessage(`${field} must be a valid UUID`),
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
    const hasUpdatableField = [
      'name',
      'firstName',
      'middleName',
      'lastName',
      'suffix',
      'preferredChannel',
      'addressLine1',
      'addressLine2',
      'cityMunicipalityId',
      'barangayId',
    ].some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error(
        'at least one of name, firstName, middleName, lastName, suffix, preferredChannel, addressLine1, addressLine2, cityMunicipalityId, or barangayId is required',
      );
    }
    return true;
  }),
  body('contactInfo')
    .not()
    .exists()
    .withMessage('contactInfo is managed from authenticated account email'),
  ...buildCanonicalNameUpdateValidators(),
  body('preferredChannel')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('preferredChannel must be a non-empty string'),
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
  body('cityMunicipalityId')
    .optional({ nullable: true })
    .custom((value) => isPostgresUuid(value))
    .withMessage('cityMunicipalityId must be a valid UUID'),
  body('barangayId')
    .optional({ nullable: true })
    .custom((value) => isPostgresUuid(value))
    .withMessage('barangayId must be a valid UUID'),
];

export const createDataSubjectRequestValidator = [
  body('requestType')
    .exists()
    .withMessage('requestType is required')
    .bail()
    .isString()
    .withMessage('requestType must be a string')
    .bail()
    .custom((value) => DATA_SUBJECT_REQUEST_TYPES.includes(value))
    .withMessage('requestType must be a supported data-subject request type'),
  body('details')
    .exists()
    .withMessage('details are required')
    .bail()
    .isString()
    .withMessage('details must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('details are required to process a data-subject request')
    .isLength({ max: 5000 })
    .withMessage('details must not exceed 5000 characters'),
];

export const updateDataSubjectRequestValidator = [
  body().custom((value) => {
    const hasUpdatableField = ['status', 'reviewerNotes', 'resolutionSummary'].some(
      (field) => value?.[field] !== undefined,
    );
    if (!hasUpdatableField) {
      throw new Error('at least one of status, reviewerNotes, or resolutionSummary is required');
    }
    return true;
  }),
  body('status')
    .optional()
    .isString()
    .withMessage('status must be a string')
    .bail()
    .custom((value) => DATA_SUBJECT_REQUEST_STATUSES.includes(value))
    .withMessage('status must be a supported data-subject request status'),
  body('reviewerNotes')
    .optional({ nullable: true })
    .isString()
    .withMessage('reviewerNotes must be a string')
    .bail()
    .isLength({ max: 5000 })
    .withMessage('reviewerNotes must not exceed 5000 characters'),
  body('resolutionSummary')
    .optional({ nullable: true })
    .isString()
    .withMessage('resolutionSummary must be a string')
    .bail()
    .isLength({ max: 5000 })
    .withMessage('resolutionSummary must not exceed 5000 characters'),
];

export const createPrivacyIncidentValidator = [
  body('summary')
    .exists()
    .withMessage('summary is required')
    .bail()
    .isString()
    .withMessage('summary must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('summary is required to register a privacy incident')
    .isLength({ max: 5000 })
    .withMessage('summary must not exceed 5000 characters'),
  body('severity')
    .optional()
    .isString()
    .withMessage('severity must be a string')
    .bail()
    .custom((value) => PRIVACY_INCIDENT_SEVERITIES.includes(value))
    .withMessage('severity must be a supported privacy incident severity'),
  body('detectedAt')
    .optional()
    .isISO8601()
    .withMessage('detectedAt must be a valid ISO-8601 timestamp'),
  body('occurredAt')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('occurredAt must be a valid ISO-8601 timestamp'),
  body('details')
    .optional({ nullable: true })
    .isString()
    .withMessage('details must be a string')
    .bail()
    .isLength({ max: 5000 })
    .withMessage('details must not exceed 5000 characters'),
  body('containmentActions')
    .optional({ nullable: true })
    .isString()
    .withMessage('containmentActions must be a string')
    .bail()
    .isLength({ max: 5000 })
    .withMessage('containmentActions must not exceed 5000 characters'),
  body('riskAssessment')
    .optional({ nullable: true })
    .isString()
    .withMessage('riskAssessment must be a string')
    .bail()
    .isLength({ max: 5000 })
    .withMessage('riskAssessment must not exceed 5000 characters'),
  body('affectedRecordCount')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('affectedRecordCount must be a non-negative integer'),
  body('affectedDataCategories')
    .optional()
    .isArray()
    .withMessage('affectedDataCategories must be an array'),
  body('affectedDataCategories.*')
    .optional()
    .isString()
    .withMessage('affectedDataCategories entries must be strings')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('affectedDataCategories entries must not be empty'),
  body('likelyPersonalDataBreach')
    .optional()
    .isBoolean()
    .withMessage('likelyPersonalDataBreach must be a boolean'),
  body('npcNotificationRequired')
    .optional()
    .isBoolean()
    .withMessage('npcNotificationRequired must be a boolean'),
  body('dataSubjectNotificationRequired')
    .optional()
    .isBoolean()
    .withMessage('dataSubjectNotificationRequired must be a boolean'),
];

export const updatePrivacyIncidentValidator = [
  body().custom((value) => {
    const hasUpdatableField = [
      'status',
      'severity',
      'reviewerNotes',
      'resolutionSummary',
      'npcNotificationReference',
      'dataSubjectNotificationReference',
      'containmentActions',
      'riskAssessment',
      'npcNotificationRequired',
      'dataSubjectNotificationRequired',
      'affectedRecordCount',
      'affectedDataCategories',
    ].some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error('at least one privacy incident update field is required');
    }
    return true;
  }),
  body('status')
    .optional()
    .isString()
    .withMessage('status must be a string')
    .bail()
    .custom((value) => PRIVACY_INCIDENT_STATUSES.includes(value))
    .withMessage('status must be a supported privacy incident status'),
  body('severity')
    .optional()
    .isString()
    .withMessage('severity must be a string')
    .bail()
    .custom((value) => PRIVACY_INCIDENT_SEVERITIES.includes(value))
    .withMessage('severity must be a supported privacy incident severity'),
  body('reviewerNotes')
    .optional({ nullable: true })
    .isString()
    .withMessage('reviewerNotes must be a string')
    .bail()
    .isLength({ max: 5000 })
    .withMessage('reviewerNotes must not exceed 5000 characters'),
  body('resolutionSummary')
    .optional({ nullable: true })
    .isString()
    .withMessage('resolutionSummary must be a string')
    .bail()
    .isLength({ max: 5000 })
    .withMessage('resolutionSummary must not exceed 5000 characters'),
  body('npcNotificationReference')
    .optional({ nullable: true })
    .isString()
    .withMessage('npcNotificationReference must be a string')
    .bail()
    .isLength({ max: 255 })
    .withMessage('npcNotificationReference must not exceed 255 characters'),
  body('dataSubjectNotificationReference')
    .optional({ nullable: true })
    .isString()
    .withMessage('dataSubjectNotificationReference must be a string')
    .bail()
    .isLength({ max: 255 })
    .withMessage('dataSubjectNotificationReference must not exceed 255 characters'),
  body('containmentActions')
    .optional({ nullable: true })
    .isString()
    .withMessage('containmentActions must be a string')
    .bail()
    .isLength({ max: 5000 })
    .withMessage('containmentActions must not exceed 5000 characters'),
  body('riskAssessment')
    .optional({ nullable: true })
    .isString()
    .withMessage('riskAssessment must be a string')
    .bail()
    .isLength({ max: 5000 })
    .withMessage('riskAssessment must not exceed 5000 characters'),
  body('affectedRecordCount')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('affectedRecordCount must be a non-negative integer'),
  body('affectedDataCategories')
    .optional()
    .isArray()
    .withMessage('affectedDataCategories must be an array'),
  body('affectedDataCategories.*')
    .optional()
    .isString()
    .withMessage('affectedDataCategories entries must be strings')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('affectedDataCategories entries must not be empty'),
  body('npcNotificationRequired')
    .optional()
    .isBoolean()
    .withMessage('npcNotificationRequired must be a boolean'),
  body('dataSubjectNotificationRequired')
    .optional()
    .isBoolean()
    .withMessage('dataSubjectNotificationRequired must be a boolean'),
];

const MOBILE_APP_CONTENT_FIELDS = [
  'slug',
  'title',
  'summary',
  'body',
  'contentType',
  'placement',
  'audience',
  'imageUrl',
  'ctaLabel',
  'ctaUrl',
  'sortOrder',
  'isPublished',
  'publishedAt',
  'startsAt',
  'endsAt',
  'metadata',
] as const;

const mobileAppContentFieldValidators = [
  body('slug')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('slug must be a non-empty string'),
  body('title')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('title must be a non-empty string'),
  body('summary').optional({ nullable: true }).isString().withMessage('summary must be a string'),
  body('body')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('body must be a non-empty string'),
  body('contentType')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('contentType must be a non-empty string'),
  body('placement')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('placement must be a non-empty string'),
  body('audience').optional({ nullable: true }).isString().withMessage('audience must be a string'),
  body('imageUrl').optional({ nullable: true }).isString().withMessage('imageUrl must be a string'),
  body('ctaLabel').optional({ nullable: true }).isString().withMessage('ctaLabel must be a string'),
  body('ctaUrl').optional({ nullable: true }).isString().withMessage('ctaUrl must be a string'),
  body('sortOrder').optional().isInt().withMessage('sortOrder must be an integer'),
  body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean'),
  body('publishedAt')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('publishedAt must be a valid ISO 8601 datetime'),
  body('startsAt')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('startsAt must be a valid ISO 8601 datetime'),
  body('endsAt')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('endsAt must be a valid ISO 8601 datetime'),
  body('metadata')
    .optional({ nullable: true })
    .custom((value) => value === null || (typeof value === 'object' && !Array.isArray(value)))
    .withMessage('metadata must be an object'),
];

export const createMobileAppContentValidator = [
  body('slug')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('slug is required and must be a non-empty string'),
  body('title')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('title is required and must be a non-empty string'),
  body('body')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('body is required and must be a non-empty string'),
  ...mobileAppContentFieldValidators,
];

export const updateMobileAppContentValidator = [
  body().custom((value) => {
    const hasUpdatableField = MOBILE_APP_CONTENT_FIELDS.some(
      (field) => value?.[field] !== undefined,
    );
    if (!hasUpdatableField) {
      throw new Error(
        'at least one of slug, title, summary, body, contentType, placement, audience, imageUrl, ctaLabel, ctaUrl, sortOrder, isPublished, publishedAt, startsAt, endsAt, or metadata is required',
      );
    }
    return true;
  }),
  ...mobileAppContentFieldValidators,
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
    .withMessage('statusId is required and must be a string')
    .bail()
    .custom((value) => isPostgresUuid(value))
    .withMessage('statusId must be a valid UUID'),
  body('citizenId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('citizenId is required and must be a string')
    .bail()
    .custom((value) => isPostgresUuid(value))
    .withMessage('citizenId must be a valid UUID'),
  body('categoryId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('categoryId is required and must be a string')
    .bail()
    .custom((value) => isPostgresUuid(value))
    .withMessage('categoryId must be a valid UUID'),
  body('severityId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('severityId is required and must be a string')
    .bail()
    .custom((value) => isPostgresUuid(value))
    .withMessage('severityId must be a valid UUID'),
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
  body('incidentId')
    .optional()
    .custom((value) => isPostgresUuid(value))
    .withMessage('incidentId must be a valid UUID'),
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
    .custom((value) => isPostgresUuid(value))
    .withMessage('statusId must be a valid UUID'),
  body('citizenId')
    .optional()
    .isString()
    .trim()
    .custom((value) => isPostgresUuid(value))
    .withMessage('citizenId must be a valid UUID'),
  body('categoryId')
    .optional()
    .isString()
    .trim()
    .custom((value) => isPostgresUuid(value))
    .withMessage('categoryId must be a valid UUID'),
  body('severityId')
    .optional()
    .isString()
    .trim()
    .custom((value) => isPostgresUuid(value))
    .withMessage('severityId must be a valid UUID'),
  ...incidentCanonicalLocalityIdFieldsValidator,
  ...updateIncidentLocationFieldsValidator,
];

export const createAssignmentValidator = [
  body('incidentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('incidentId is required and must be a string')
    .bail()
    .custom((value) => isPostgresUuid(value))
    .withMessage('incidentId must be a valid UUID'),
  body('responderId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('responderId is required and must be a string')
    .bail()
    .custom((value) => isPostgresUuid(value))
    .withMessage('responderId must be a valid UUID'),
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
    .withMessage('incidentId must be a non-empty string')
    .bail()
    .custom((value) => isPostgresUuid(value))
    .withMessage('incidentId must be a valid UUID'),
  body('responderId')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('responderId must be a non-empty string')
    .bail()
    .custom((value) => isPostgresUuid(value))
    .withMessage('responderId must be a valid UUID'),
  body('assignedDate').optional().isISO8601().withMessage('assignedDate must be an ISO8601 date'),
  body('responseStart').optional().isISO8601().withMessage('responseStart must be an ISO8601 date'),
  body('responseEnd').optional().isISO8601().withMessage('responseEnd must be an ISO8601 date'),
  body('outcome').optional().isString().withMessage('outcome must be a string'),
  body('notes').optional().isString().withMessage('notes must be a string'),
];

// Duplicate removed. Only one export for updateIncidentValidator should exist.
export const createUserValidator = [
  ...buildCanonicalNameCreateValidators(),
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
      'role must be one of NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_ADMIN, CITY_CONTENT_EDITOR, DISPATCHER, RESPONDER, CITIZEN_REPORTER, AUDITOR',
    ),
  body('jurisdictionType')
    .optional()
    .isString()
    .custom((value) =>
      ['region', 'province', 'city', 'barangay'].includes(value.trim().toLowerCase()),
    )
    .withMessage('jurisdictionType must be one of region, province, city, or barangay'),
  body('jurisdictionId')
    .optional()
    .custom((value) => isPostgresUuid(value))
    .withMessage('jurisdictionId must be a valid UUID'),
  body().custom((value) => {
    const hasJurisdictionType = value?.jurisdictionType !== undefined;
    const hasJurisdictionId = value?.jurisdictionId !== undefined;
    if (hasJurisdictionType !== hasJurisdictionId) {
      throw new Error('jurisdictionType and jurisdictionId must be provided together');
    }
    return true;
  }),
];

export const updateUserValidator = [
  body().custom((value) => {
    const hasUpdatableField = [
      'name',
      'firstName',
      'middleName',
      'lastName',
      'suffix',
      'email',
      'password',
      'role',
      'jurisdictionType',
      'jurisdictionId',
    ].some((field) => value?.[field] !== undefined);
    if (!hasUpdatableField) {
      throw new Error(
        'at least one of name, firstName, middleName, lastName, suffix, email, password, role, jurisdictionType, or jurisdictionId is required',
      );
    }
    return true;
  }),
  ...buildCanonicalNameUpdateValidators(),
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
      'role must be one of NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_ADMIN, CITY_CONTENT_EDITOR, DISPATCHER, RESPONDER, CITIZEN_REPORTER, AUDITOR',
    ),
  body('jurisdictionType')
    .optional()
    .isString()
    .custom((value) =>
      ['region', 'province', 'city', 'barangay'].includes(value.trim().toLowerCase()),
    )
    .withMessage('jurisdictionType must be one of region, province, city, or barangay'),
  body('jurisdictionId')
    .optional()
    .custom((value) => isPostgresUuid(value))
    .withMessage('jurisdictionId must be a valid UUID'),
  body().custom((value) => {
    const hasJurisdictionType = value?.jurisdictionType !== undefined;
    const hasJurisdictionId = value?.jurisdictionId !== undefined;
    if (hasJurisdictionType !== hasJurisdictionId) {
      throw new Error('jurisdictionType and jurisdictionId must be provided together');
    }
    return true;
  }),
];
