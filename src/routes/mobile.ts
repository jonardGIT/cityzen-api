/**
 * Canonical mobile-citizen surface (Tuguegarao-first pilot).
 *
 * The `/mobile/*` namespace is the canonical entry surface for citizen mobile
 * clients (MyTuguegarao). Each authenticated route requires CITIZEN_REPORTER
 * and the backend scopes results to the JWT subject's own citizen profile.
 * Public Cagayan geography reference routes remain province-wide reference
 * data for locality selection flows even while the overall mobile rollout
 * remains Tuguegarao-first.
 *
 * Compatibility-only aliases live OUTSIDE this router and are kept for
 * dashboard-bootstrap and pre-mobile clients:
 *   - POST /citizens/link-me  (alias for PATCH /mobile/profile)
 *   - POST /incidents/report  (alias for POST /mobile/incidents/report)
 *
 * See `mobileCitizenSurface` in src/docs/dashboardCrudContract.ts for the
 * authoritative canonical-vs-compatibility mapping. Backend authorization,
 * jurisdiction scoping, and trust-layer rules are enforced server-side
 * regardless of which surface a client uses.
 */
import { Router } from 'express';
import { param } from 'express-validator';
import { getMyCitizenProfile, linkMyCitizenProfile } from '../controllers/citizensController.js';
import {
  createCitizenIncidentReport,
  getIncidentById,
  getIncidentTimeline,
  getIncidents,
} from '../controllers/incidentsController.js';
import { getPublishedMobileAppContent } from '../controllers/mobileAppContentsController.js';
import {
  getCagayanGeographyMeta,
  getCagayanLocalities,
  getCagayanLocalityBarangays,
} from '../controllers/mobileReferencesController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createCitizenIncidentReportValidator,
  linkMyCitizenProfileValidator,
} from '../validators/bodyValidators.js';
import { incidentTimelineParamValidator } from '../validators/incidentTrustValidators.js';

const router = Router();

const localityIdParamValidator = [
  param('localityId').isUUID().withMessage('localityId must be a valid UUID'),
];

router.get('/content', asyncHandler(getPublishedMobileAppContent));
router.get('/reference-data/geography/meta', asyncHandler(getCagayanGeographyMeta));
router.get('/cagayan/localities', asyncHandler(getCagayanLocalities));
router.get(
  '/cagayan/localities/:localityId/barangays',
  ...localityIdParamValidator,
  validateRequest,
  asyncHandler(getCagayanLocalityBarangays),
);

router.get(
  '/profile',
  requireJwtAuth,
  requireRole('CITIZEN_REPORTER'),
  asyncHandler(getMyCitizenProfile),
);
router.patch(
  '/profile',
  requireJwtAuth,
  requireRole('CITIZEN_REPORTER'),
  ...linkMyCitizenProfileValidator,
  validateRequest,
  asyncHandler(linkMyCitizenProfile),
);

router.get(
  '/incidents',
  requireJwtAuth,
  requireRole('CITIZEN_REPORTER'),
  asyncHandler(getIncidents),
);
router.get(
  '/incidents/:id',
  requireJwtAuth,
  requireRole('CITIZEN_REPORTER'),
  asyncHandler(getIncidentById),
);
router.get(
  '/incidents/:id/timeline',
  requireJwtAuth,
  requireRole('CITIZEN_REPORTER'),
  incidentTimelineParamValidator,
  validateRequest,
  asyncHandler(getIncidentTimeline),
);
router.post(
  '/incidents/report',
  requireJwtAuth,
  requireRole('CITIZEN_REPORTER'),
  createCitizenIncidentReportValidator,
  validateRequest,
  asyncHandler(createCitizenIncidentReport),
);

export default router;
