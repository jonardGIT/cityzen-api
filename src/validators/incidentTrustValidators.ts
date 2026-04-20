import { param } from 'express-validator';

export const caseTokenParamValidator = [
  param('caseToken')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ min: 16, max: 128 })
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('caseToken must be a valid case token'),
];

export const incidentTimelineParamValidator = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
];
